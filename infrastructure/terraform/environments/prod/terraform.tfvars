environment = "prod"
project_name = "engagerr"
region = "us-east-1"
domain_name = "engagerr.io"

# Vercel configuration
vercel_team_id = "team_placeholder"
vercel_project_id = "prj_engagerr"
vercel_api_token = "vercel_token_placeholder" # Replaced during deployment

# Supabase configuration
supabase_project_ref = "supabase_prod_project"
supabase_api_key = "supabase_key_placeholder" # Replaced during deployment
supabase_db_password = "supabase_password_placeholder" # Replaced during deployment
supabase_api_url = "https://engagerr.supabase.co"
supabase_anon_key = "supabase_anon_key_placeholder" # Replaced during deployment

# Database configuration
database_config = {
  size = "large" # Production-grade instance
  storage_gb = 100
  read_replicas = 2 # Multiple read replicas for high availability
  connection_pooling = true
  pooler_mode = "transaction"
  auto_scaling = true
  auto_pause = false # No pausing in production
}

# AI services configuration
ai_container_config = {
  llama_image = "engagerr-llama:stable"
  mistral_image = "engagerr-mistral:stable"
  cpu = 8 # Production-level CPU
  memory = 32 # Production-level memory
  use_gpu = true # GPU for production performance
}

# AI container configuration settings
llama_task_cpu = 8192 # 8 vCPU for production
llama_task_memory = 32768 # 32GB for production
llama_service_count = 3 # Multiple instances for load balancing
mistral_task_cpu = 4096 # 4 vCPU for production
mistral_task_memory = 16384 # 16GB for production
mistral_service_count = 2 # Multiple instances for availability
router_task_cpu = 2048 # 2 vCPU for production
router_task_memory = 4096 # 4GB for production
router_service_count = 2 # Multiple instances for availability
enable_model_auto_scaling = true # Auto-scaling in production

# API keys for external services
stripe_api_key = "stripe_key_placeholder" # Replaced during deployment
stripe_webhook_secret = "stripe_webhook_placeholder" # Replaced during deployment
resend_api_key = "resend_key_placeholder" # Replaced during deployment
deepseek_api_key = "deepseek_key_placeholder" # Replaced during deployment
huggingface_api_key = "huggingface_key_placeholder" # Replaced during deployment

# Monitoring configuration
enable_monitoring = true
cloudwatch_log_retention_days = 30 # 30 days log retention for production

# Backup configuration
backup_retention_days = 30 # 30 days retention for production

# Networking configuration
vpc_cidr_block = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"] # Multi-AZ for high availability
enable_cdn = true # CDN enabled in production
allowed_origins = ["https://engagerr.io", "https://www.engagerr.io", "https://app.engagerr.io"]

# Storage configuration
efs_throughput_mode = "provisioned"
efs_provisioned_throughput = 128 # Higher throughput for production workloads

# Cost optimization
ai_container_registry = "engagerr-registry"

# GitHub repository
github_repository = "organization/engagerr"

# Resource tagging
tags = {
  Project = "Engagerr"
  Environment = "production"
  ManagedBy = "Terraform"
  Team = "Engineering"
  CostCenter = "Production"
}

# Monitoring configuration
monitoring_config = {
  alert_email = "alerts@engagerr.io"
  slack_webhook = "https://hooks.slack.com/services/production-placeholder"
  metrics_retention_days = 30
  enable_anomaly_detection = true
  dashboard_refresh_rate = 60
}

# Application environment variables
app_environment_variables = {
  NODE_ENV = "production"
  NEXT_PUBLIC_API_URL = "https://engagerr.io/api"
  NEXT_PUBLIC_SUPABASE_URL = "https://engagerr.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-for-supabase-anon-key"
  AI_SERVICES_ENDPOINT = "http://prod-ai-router.engagerr.internal:5000"
  STRIPE_PUBLIC_KEY = "pk_live_placeholder"
  STRIPE_WEBHOOK_SECRET = "whsec_placeholder"
  RESEND_API_KEY = "re_placeholder"
  ANALYTICS_ENABLED = "true"
  ERROR_REPORTING_RATE = "100"
}

# Security configuration
security_config = {
  enable_waf = true
  ddos_protection = true
  ssl_policy = "TLS-1-2-2019-10"
  ip_allowlist_enabled = false
  enable_mfa_for_admin = true
  security_headers_enabled = true
}

# Disaster recovery configuration
disaster_recovery_config = {
  cross_region_replication = true
  backup_region = "us-west-2"
  recovery_point_objective_minutes = 15
  recovery_time_objective_minutes = 60
}

# Performance optimization
performance_config = {
  edge_caching_enabled = true
  compression_enabled = true
  browser_ttl_seconds = 86400
  api_cache_ttl_seconds = 300
}