# Application metadata outputs
output "application_name" {
  description = "The name of the Engagerr application"
  value       = var.app_name
}

output "environment" {
  description = "The deployment environment (development, staging, production)"
  value       = var.environment
}

# Vercel deployment outputs
output "vercel_project_id" {
  description = "The Vercel project ID for the Engagerr application"
  value       = vercel_project.engagerr.id
}

output "vercel_deployment_url" {
  description = "The URL of the deployed Vercel application"
  value       = vercel_project.engagerr.deployment_url
}

# Supabase project outputs
output "supabase_project_url" {
  description = "The URL of the Supabase project dashboard"
  value       = supabase_project.engagerr.dashboard_url
}

output "supabase_api_url" {
  description = "The REST API URL for the Supabase project"
  value       = supabase_project.engagerr.api_url
}

output "supabase_anon_key" {
  description = "The anonymous key for Supabase client-side authentication"
  value       = supabase_project.engagerr.anon_key
  sensitive   = true
}

output "supabase_service_role_key" {
  description = "The service role key for Supabase server-side operations (privileged access)"
  value       = supabase_project.engagerr.service_role_key
  sensitive   = true
}

# Database outputs
output "database_connection_string" {
  description = "PostgreSQL connection string for direct database access"
  value       = "postgresql://${supabase_project.engagerr.db_user}:${supabase_project.engagerr.db_password}@${supabase_project.engagerr.db_host}:${supabase_project.engagerr.db_port}/${supabase_project.engagerr.db_name}"
  sensitive   = true
}

output "database_host" {
  description = "Database host endpoint for direct connections"
  value       = supabase_project.engagerr.db_host
}

# Storage outputs
output "storage_bucket_name" {
  description = "Name of the primary Supabase storage bucket for file storage"
  value       = supabase_storage_bucket.main.name
}

output "storage_url" {
  description = "URL for accessing files in the Supabase storage bucket"
  value       = "${supabase_project.engagerr.api_url}/storage/v1/object/public/${supabase_storage_bucket.main.name}"
}

# Container registry outputs
output "container_registry_url" {
  description = "URL of the container registry where AI model images are stored"
  value       = aws_ecr_repository.ai_models.repository_url
}

# Monitoring outputs
output "monitoring_dashboard_url" {
  description = "URL for the infrastructure monitoring dashboard"
  value       = var.environment == "production" ? "https://vercel.com/analytics/dashboard/${vercel_project.engagerr.id}" : null
}

# AI model endpoints
output "ai_service_endpoints" {
  description = "Endpoints for all deployed AI model services"
  value = {
    llama_model      = module.ai_containers.llama_endpoint
    mistral_model    = module.ai_containers.mistral_endpoint
    api_router       = module.ai_containers.router_endpoint
    external_ai_api  = var.external_ai_api_url
  }
}

# Resource identifiers for reference
output "resource_ids" {
  description = "IDs of the key infrastructure resources for reference"
  value = {
    supabase_project_id     = supabase_project.engagerr.id
    database_id             = supabase_project.engagerr.db_id
    storage_bucket_id       = supabase_storage_bucket.main.id
    ai_container_cluster_id = module.ai_containers.cluster_id
  }
}