# General project configuration
variable "project_name" {
  type        = string
  default     = "engagerr"
  description = "Name of the project used for resource naming and tagging"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Deployment environment (dev, staging, prod)"
}

variable "region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for infrastructure resources"
}

variable "domain_name" {
  type        = string
  default     = "engagerr.io"
  description = "Primary domain name for the application"
}

variable "tags" {
  type        = map(string)
  default     = {
    Project   = "Engagerr"
    ManagedBy = "Terraform"
  }
  description = "Tags to apply to all resources"
}

# Vercel configuration
variable "vercel_api_token" {
  type        = string
  sensitive   = true
  description = "Vercel API token for project deployments"
}

variable "vercel_team_id" {
  type        = string
  description = "Vercel team ID for project organization"
}

variable "vercel_project_id" {
  type        = string
  description = "Vercel project ID for the Engagerr application"
}

# Supabase configuration
variable "supabase_project_ref" {
  type        = string
  description = "Supabase project reference ID"
}

variable "supabase_api_key" {
  type        = string
  sensitive   = true
  description = "Supabase API key for management operations"
}

variable "supabase_db_password" {
  type        = string
  sensitive   = true
  description = "Password for Supabase PostgreSQL database"
}

# Payment processing
variable "stripe_api_key" {
  type        = string
  sensitive   = true
  description = "Stripe API key for payment processing"
}

variable "stripe_webhook_secret" {
  type        = string
  sensitive   = true
  description = "Stripe webhook signing secret for security verification"
}

# Email service
variable "resend_api_key" {
  type        = string
  sensitive   = true
  description = "Resend API key for email service"
}

# AI service credentials
variable "deepseek_api_key" {
  type        = string
  sensitive   = true
  description = "DeepSeek API key for AI language model capabilities"
}

variable "huggingface_api_key" {
  type        = string
  sensitive   = true
  description = "Hugging Face API key for CLIP/BLIP models"
}

# Container and AI model configuration
variable "ai_container_registry" {
  type        = string
  description = "Container registry for AI model images"
}

variable "llama_model_version" {
  type        = string
  default     = "3-8b"
  description = "Version of Llama model to use in self-hosted containers"
}

variable "mistral_model_version" {
  type        = string
  default     = "7b-instruct"
  description = "Version of Mistral model to use in self-hosted containers"
}

variable "ai_container_cpu" {
  type        = number
  default     = 4
  description = "CPU allocation for AI model containers"
}

variable "ai_container_memory" {
  type        = number
  default     = 16
  description = "Memory allocation in GB for AI model containers"
}

variable "ai_container_gpu" {
  type        = bool
  default     = true
  description = "Whether to allocate GPU for AI model containers"
}

# Database configuration
variable "database_size" {
  type        = string
  default     = "medium"
  description = "Size of the Supabase database instance"
}

variable "database_replicas" {
  type        = number
  default     = 1
  description = "Number of read replicas for the database"
}

# Monitoring and backup
variable "enable_monitoring" {
  type        = bool
  default     = true
  description = "Whether to enable infrastructure monitoring"
}

variable "backup_retention_days" {
  type        = number
  default     = 30
  description = "Number of days to retain database backups"
}

# Network and security
variable "enable_cdn" {
  type        = bool
  default     = true
  description = "Whether to enable CDN for static assets"
}

variable "allowed_origins" {
  type        = list(string)
  default     = ["https://engagerr.io", "https://www.engagerr.io"]
  description = "List of allowed origins for CORS configuration"
}