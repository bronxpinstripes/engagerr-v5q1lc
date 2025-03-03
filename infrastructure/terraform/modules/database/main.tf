terraform {
  required_providers {
    supabase = {
      source  = "vercel/terraform-provider-supabase"
      version = "~> 0.3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0.0"
}

# Generate a secure random password for the database
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Local variables for configuration based on environment
locals {
  # Define environment-specific settings
  is_production = var.environment == "prod"
  is_staging = var.environment == "staging"
  
  # Settings based on environment
  db_settings = {
    dev = {
      compute_addon = null
      disk_size_gb = 8
      point_in_time_recovery = false
    }
    staging = {
      compute_addon = "2x-compute"
      disk_size_gb = 16
      point_in_time_recovery = true
    }
    prod = {
      compute_addon = "4x-compute"
      disk_size_gb = 32
      point_in_time_recovery = true
    }
  }
}

# Create a Supabase project
resource "supabase_project" "main" {
  name           = "${var.project_name}-${var.environment}"
  organization_id = var.supabase_organization_id
  region         = var.region
  plan           = var.database_plan
  db_password    = random_password.db_password.result
  
  # Configure environment-specific settings
  compute_addon = local.db_settings[var.environment].compute_addon
  db_size       = local.db_settings[var.environment].disk_size_gb
  
  # Enable point-in-time recovery for staging and production
  point_in_time_recovery_enabled = local.db_settings[var.environment].point_in_time_recovery
}

# Apply SQL to set up database extensions and configurations
resource "supabase_sql" "setup" {
  project_ref = supabase_project.main.ref
  
  # This SQL will be run against the newly created database
  sql = <<-EOT
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS ltree;
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Set database parameters for better performance
    ALTER DATABASE postgres SET log_min_duration_statement = '1000';
    ALTER DATABASE postgres SET statement_timeout = '30000';
    ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '60000';
    
    -- For production environments, set additional optimization parameters
    ${local.is_production ? "ALTER DATABASE postgres SET work_mem = '16MB';" : ""}
    ${local.is_production ? "ALTER DATABASE postgres SET maintenance_work_mem = '128MB';" : ""}
    ${local.is_production ? "ALTER DATABASE postgres SET random_page_cost = 1.1;" : ""}
    
    -- Create LTREE helper function for content relationship traversal
    CREATE OR REPLACE FUNCTION get_content_family(root_content_id UUID)
    RETURNS TABLE (
        content_id UUID,
        title TEXT,
        content_type TEXT,
        platform_type TEXT,
        relationship_type TEXT,
        depth INT,
        metrics JSONB
    ) AS $$
    BEGIN
        RETURN QUERY
        WITH RECURSIVE content_tree AS (
            -- Base query for root content (will work once tables exist)
            SELECT 
                c.id AS content_id,
                c.title,
                c.content_type,
                p.platform_type,
                'ROOT' AS relationship_type,
                0 AS depth,
                jsonb_build_object(
                    'views', cm.views,
                    'engagements', cm.engagements,
                    'shares', cm.shares
                ) AS metrics
            FROM content c
            JOIN platform p ON c.platform_id = p.id
            LEFT JOIN content_metrics cm ON c.id = cm.content_id
            WHERE c.id = root_content_id
            
            UNION ALL
            
            -- Recursive query for child content
            SELECT
                c.id AS content_id,
                c.title,
                c.content_type,
                p.platform_type,
                cr.relationship_type,
                ct.depth + 1,
                jsonb_build_object(
                    'views', cm.views,
                    'engagements', cm.engagements,
                    'shares', cm.shares
                ) AS metrics
            FROM content c
            JOIN platform p ON c.platform_id = p.id
            JOIN content_relationship cr ON c.id = cr.target_content_id
            LEFT JOIN content_metrics cm ON c.id = cm.content_id
            JOIN content_tree ct ON ct.content_id = cr.source_content_id
            WHERE ct.depth < 5 -- Prevent infinite recursion and limit depth
        )
        SELECT * FROM content_tree
        ORDER BY depth, platform_type;
    END;
    $$ LANGUAGE plpgsql;
    
    COMMENT ON FUNCTION get_content_family(UUID) IS 'Retrieves the content family tree for a given root content ID';
    
    -- Function to maintain LTREE paths for content relationships
    CREATE OR REPLACE FUNCTION update_content_path()
    RETURNS TRIGGER AS $$
    DECLARE
      v_path ltree;
      v_parent_path ltree;
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- For new or updated relationships
        IF NEW.parent_id IS NULL THEN
          -- This is a root node
          v_path = text2ltree(NEW.id::text);
        ELSE
          -- Get parent's path
          SELECT path INTO v_parent_path FROM content_nodes WHERE id = NEW.parent_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent node % not found', NEW.parent_id;
          END IF;
          -- Set path as parent's path with this node's ID appended
          v_path = v_parent_path || text2ltree(NEW.id::text);
        END IF;
        NEW.path = v_path;
        NEW.depth = nlevel(v_path);
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    
    COMMENT ON FUNCTION update_content_path() IS 
    'Trigger function to maintain hierarchical paths using LTREE when content relationships change';
    
    -- Additional index creation SQL for when tables exist:
    -- This will be included in the Prisma migrations, but documenting the required indexes here:
    /*
    CREATE INDEX IF NOT EXISTS idx_content_nodes_path ON content_nodes USING GIST (path);
    CREATE INDEX IF NOT EXISTS idx_content_nodes_path_btree ON content_nodes USING BTREE (path);
    CREATE INDEX IF NOT EXISTS idx_content_nodes_parent_id ON content_nodes (parent_id);
    */
  EOT
  
  depends_on = [supabase_project.main]
}

# Set up database backup policy in AWS S3 for additional backup layer
resource "aws_s3_bucket" "db_backups" {
  count  = local.is_production || local.is_staging ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-db-backups"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-db-backups"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Ensure the S3 bucket is private
resource "aws_s3_bucket_public_access_block" "db_backups" {
  count  = local.is_production || local.is_staging ? 1 : 0
  bucket = aws_s3_bucket.db_backups[0].id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure lifecycle rules for backup retention
resource "aws_s3_bucket_lifecycle_configuration" "db_backups" {
  count  = local.is_production || local.is_staging ? 1 : 0
  bucket = aws_s3_bucket.db_backups[0].id
  
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    
    expiration {
      days = var.backup_retention_days
    }
  }
}

# Configure server-side encryption for S3 backups
resource "aws_s3_bucket_server_side_encryption_configuration" "db_backups" {
  count  = local.is_production || local.is_staging ? 1 : 0
  bucket = aws_s3_bucket.db_backups[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Create database backup schedule if supported
resource "supabase_database_backup_schedule" "backup_schedule" {
  count = local.is_production || local.is_staging ? 1 : 0
  
  project_ref = supabase_project.main.ref
  schedule    = var.backup_schedule
  retention_period = var.backup_retention_days
}

# Output the database connection information
output "supabase_project_id" {
  value       = supabase_project.main.id
  description = "The ID of the Supabase project"
}

output "supabase_project_ref" {
  value       = supabase_project.main.ref
  description = "The reference ID of the Supabase project"
}

output "supabase_api_url" {
  value       = supabase_project.main.api_url
  description = "The API URL for the Supabase project"
}

output "supabase_database_url" {
  value       = supabase_project.main.database_url
  description = "The database connection URL"
  sensitive   = true
}

output "database_password" {
  value       = random_password.db_password.result
  description = "The generated database password"
  sensitive   = true
}