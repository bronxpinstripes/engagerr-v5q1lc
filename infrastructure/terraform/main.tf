# Engagerr platform infrastructure configuration

# Define local variables for resource naming and tagging
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Database module for PostgreSQL resources via Supabase
module "database" {
  source = "./modules/database"
  
  project_name = var.project_name
  environment  = var.environment
  region       = var.region
  supabase_api_url = var.supabase_api_url
  supabase_api_key = var.supabase_api_key
  database_config = var.database_config
  backup_schedule = var.environment == "prod" ? "0 */6 * * *" : "0 0 * * *"
  backup_retention_days = var.environment == "prod" ? 30 : 7
  read_replica_count = var.environment == "prod" ? var.database_config.read_replicas : 0
  db_extensions = ["ltree", "pg_stat_statements", "pgcrypto", "uuid-ossp"]
  tags = local.common_tags
}

# AI services module for containerized AI models
module "ai_services" {
  source = "./modules/ai-services"
  
  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.region
  llama_image = var.ai_container_config.llama_image
  mistral_image = var.ai_container_config.mistral_image
  llama_task_cpu = var.ai_container_config.cpu * 1024
  llama_task_memory = var.ai_container_config.memory * 1024
  mistral_task_cpu = var.environment == "prod" ? 2048 : 1024
  mistral_task_memory = var.environment == "prod" ? 8192 : 4096
  router_task_cpu = var.environment == "prod" ? 1024 : 512
  router_task_memory = var.environment == "prod" ? 2048 : 1024
  llama_service_count = var.environment == "prod" ? 3 : 1
  mistral_service_count = var.environment == "prod" ? 2 : 1
  router_service_count = var.environment == "prod" ? 2 : 1
  vpc_cidr_block = "10.0.0.0/16"
  availability_zones = var.environment == "prod" ? ["${var.region}a", "${var.region}b", "${var.region}c"] : ["${var.region}a"]
  deepseek_api_key = var.deepseek_api_key
  huggingface_api_key = var.huggingface_api_key
  tags = local.common_tags
}

# Vercel project for hosting the NextJS application
resource "vercel_project" "vercel_project" {
  name = local.resource_prefix
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repository
  }
  
  build_command = "npm run build"
  output_directory = ".next"
  production_branch = "main"
  root_directory = "src/web"
  
  ignore_command = "if [ \"$VERCEL_ENV\" = \"production\" ]; then exit 1; else exit 0; fi"
  
  environment = [
    {
      key    = "NEXT_PUBLIC_AI_ENDPOINT"
      value  = module.ai_services.ai_services_endpoint
      target = ["production", "preview", "development"]
    },
    {
      key    = "DATABASE_URL"
      value  = module.database.database_url
      target = ["production", "preview", "development"]
    },
    {
      key    = "SUPABASE_URL"
      value  = var.supabase_api_url
      target = ["production", "preview", "development"]
    },
    {
      key    = "SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key
      target = ["production", "preview", "development"]
    },
    {
      key    = "ENVIRONMENT"
      value  = var.environment
      target = ["production", "preview", "development"]
    }
  ]
}

# Vercel deployment for the application
resource "vercel_deployment" "vercel_deployment" {
  project_id = vercel_project.vercel_project.id
  production = true
  regions    = ["iad1", "sfo1", "lhr1"]
  delete_on_destroy = true
}

# Vercel domain configuration
resource "vercel_domain" "vercel_domain" {
  project_id = vercel_project.vercel_project.id
  domain     = var.domain_name
  redirect   = null
  git_branch = var.environment == "prod" ? "main" : var.environment
}

# CloudWatch dashboard for infrastructure monitoring
resource "aws_cloudwatch_dashboard" "cloudwatch_dashboard" {
  dashboard_name = "${local.resource_prefix}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      # Database metrics widget
      {
        type = "metric",
        x = 0,
        y = 0,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "${module.database.db_instance_id}" ],
            [ ".", "FreeStorageSpace", ".", "." ],
            [ ".", "DatabaseConnections", ".", "." ]
          ],
          period = 300,
          stat = "Average",
          region = "${var.region}",
          title = "Database Metrics"
        }
      },
      # AI Services widget
      {
        type = "metric",
        x = 0,
        y = 6,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/ECS", "CPUUtilization", "ServiceName", "${local.resource_prefix}-llama", "ClusterName", "${module.ai_services.ai_cluster_id}" ],
            [ ".", ".", ".", "${local.resource_prefix}-mistral", ".", "." ],
            [ ".", ".", ".", "${local.resource_prefix}-ai-router", ".", "." ]
          ],
          period = 300,
          stat = "Average",
          region = "${var.region}",
          title = "AI Services CPU Utilization"
        }
      },
      # API Request metrics
      {
        type = "metric",
        x = 12,
        y = 0,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${module.ai_services.load_balancer_name}" ],
            [ ".", "HTTPCode_Target_4XX_Count", ".", "." ],
            [ ".", "HTTPCode_Target_5XX_Count", ".", "." ]
          ],
          period = 300,
          stat = "Sum",
          region = "${var.region}",
          title = "AI API Requests"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

# Output the Vercel deployment URL
output "vercel_deployment_url" {
  value       = "https://${var.domain_name}"
  description = "The URL of the deployed Vercel application"
}

# Output the database connection string (sensitive)
output "database_connection_string" {
  value       = module.database.connection_string
  description = "Database connection string for application configuration"
  sensitive   = true
}

# Output the AI services endpoint
output "ai_services_endpoint" {
  value       = module.ai_services.ai_services_endpoint
  description = "Endpoint for the AI services router"
}

# Output the CloudWatch dashboard URL
output "cloudwatch_dashboard_url" {
  value       = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.cloudwatch_dashboard.dashboard_name}"
  description = "URL for the CloudWatch dashboard monitoring infrastructure"
}