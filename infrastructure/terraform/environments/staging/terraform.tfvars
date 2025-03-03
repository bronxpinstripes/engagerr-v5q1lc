# General Settings
environment = "staging"
project_name = "engagerr"
region = "us-east-1"
domain_name = "staging.engagerr.io"

# Vercel Configuration
vercel_team_id = "team_placeholder"
vercel_project_id = "prj_stg_engagerr"
vercel_api_token = "vercel_token_placeholder"

# Supabase Configuration
supabase_project_ref = "supabase_stg_project"
supabase_api_key = "supabase_key_placeholder"
supabase_db_password = "supabase_password_placeholder"
supabase_api_url = "https://staging-engagerr.supabase.co"
supabase_anon_key = "supabase_anon_key_placeholder"

# Database Configuration
database_config = {
  size = "medium"
  storage_gb = 50
  read_replicas = 1
  connection_pooling = true
  pooler_mode = "transaction"
  auto_scaling = true
  auto_pause = false
}

# AI Container Configuration
ai_container_config = {
  llama_image = "engagerr-llama:latest"
  mistral_image = "engagerr-mistral:latest"
  cpu = 4
  memory = 16
  use_gpu = true
}

# AI Service Resource Allocation
llama_task_cpu = 4096
llama_task_memory = 16384
llama_service_count = 2

mistral_task_cpu = 2048
mistral_task_memory = 8192
mistral_service_count = 2

router_task_cpu = 1024
router_task_memory = 2048
router_service_count = 1

enable_model_auto_scaling = true

# External Service API Keys
stripe_api_key = "stripe_key_placeholder"
stripe_webhook_secret = "stripe_webhook_placeholder"
resend_api_key = "resend_key_placeholder"
deepseek_api_key = "deepseek_key_placeholder"
huggingface_api_key = "huggingface_key_placeholder"

# Monitoring Configuration
enable_monitoring = true
cloudwatch_log_retention_days = 14
backup_retention_days = 14

# Network Configuration
vpc_cidr_block = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
enable_cdn = true
allowed_origins = ["https://staging.engagerr.io", "http://localhost:3000"]

# Storage Configuration
efs_throughput_mode = "bursting"
efs_provisioned_throughput = 0

# Container Registry
ai_container_registry = "engagerr-registry"

# Source Control
github_repository = "organization/engagerr"

# Resource Tagging
tags = {
  Project = "Engagerr"
  Environment = "staging"
  ManagedBy = "Terraform"
  Team = "Engineering"
  CostCenter = "Staging"
}

# Monitoring & Alerting
monitoring_config = {
  alert_email = "staging-alerts@engagerr.io"
  slack_webhook = "https://hooks.slack.com/services/placeholder"
  metrics_retention_days = 14
}

# Application Environment Variables
app_environment_variables = {
  NODE_ENV = "staging"
  NEXT_PUBLIC_API_URL = "https://staging.engagerr.io/api"
  NEXT_PUBLIC_SUPABASE_URL = "https://staging-engagerr.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-for-supabase-anon-key"
  AI_SERVICES_ENDPOINT = "http://staging-ai-router.engagerr.internal:5000"
  STRIPE_PUBLIC_KEY = "pk_test_placeholder"
  STRIPE_WEBHOOK_SECRET = "whsec_placeholder"
  RESEND_API_KEY = "re_placeholder"
}

# Security Configuration
security_config = {
  enable_waf = true
  ddos_protection = true
  ssl_policy = "TLS-1-2-2019-10"
  ip_allowlist_enabled = false
}