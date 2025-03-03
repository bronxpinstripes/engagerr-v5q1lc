environment = "dev"
project_name = "engagerr"
region = "us-east-1"
domain_name = "dev.engagerr.io"

# Vercel configuration
vercel_team_id = "team_placeholder"
vercel_project_id = "vercel_project_placeholder"
vercel_api_token = "vercel_token_placeholder" # Replaced during deployment

# Supabase configuration
supabase_project_ref = "supabase_project_placeholder"
supabase_api_key = "supabase_key_placeholder" # Replaced during deployment
supabase_db_password = "supabase_password_placeholder" # Replaced during deployment
supabase_api_url = "https://supabase_project_placeholder.supabase.co"
supabase_anon_key = "supabase_anon_key_placeholder" # Replaced during deployment

# Database configuration
database_config = {
  size = "micro" # Smallest instance for dev
  storage_gb = 10
  read_replicas = 0 # No read replicas in dev
  connection_pooling = true
  pooler_mode = "transaction"
  auto_scaling = false
  auto_pause = true # Auto-pause in dev for cost savings
}

# AI services configuration
ai_container_config = {
  llama_image = "engagerr-llama:latest"
  mistral_image = "engagerr-mistral:latest"
  cpu = 2 # Reduced CPU for dev
  memory = 8 # Reduced memory for dev
  use_gpu = false # No GPU in dev
}

# AI container configuration settings
llama_task_cpu = 2048 # 2 vCPU for dev
llama_task_memory = 8192 # 8GB for dev
llama_service_count = 1
mistral_task_cpu = 1024 # 1 vCPU for dev
mistral_task_memory = 4096 # 4GB for dev
mistral_service_count = 1
router_task_cpu = 512
router_task_memory = 1024
router_service_count = 1
enable_model_auto_scaling = false # No auto-scaling in dev

# API keys for external services
stripe_api_key = "stripe_key_placeholder" # Replaced during deployment
stripe_webhook_secret = "stripe_webhook_placeholder" # Replaced during deployment
resend_api_key = "resend_key_placeholder" # Replaced during deployment
deepseek_api_key = "deepseek_key_placeholder" # Replaced during deployment
huggingface_api_key = "huggingface_key_placeholder" # Replaced during deployment

# Monitoring configuration
enable_monitoring = true
cloudwatch_log_retention_days = 7 # Shorter retention for dev

# Backup configuration
backup_retention_days = 7 # 7 days retention for dev

# Networking configuration
vpc_cidr_block = "10.0.0.0/16"
availability_zones = ["us-east-1a"] # Single AZ for dev
enable_cdn = false # No CDN in dev
allowed_origins = ["https://dev.engagerr.io", "http://localhost:3000"]

# Storage configuration
efs_throughput_mode = "bursting"
efs_provisioned_throughput = 0

# Cost optimization
ai_container_registry = "engagerr-registry"

# GitHub repository
github_repository = "organization/engagerr"

# Resource tagging
tags = {
  Project = "Engagerr"
  Environment = "dev"
  ManagedBy = "Terraform"
  Team = "Engineering"
  CostCenter = "Development"
}