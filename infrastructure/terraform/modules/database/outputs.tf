# Output definitions for the Supabase PostgreSQL database module
# Exposes database connection information and credentials for use by other modules

output "database_endpoint" {
  description = "The endpoint URL of the primary Supabase PostgreSQL database"
  value       = supabase_project.main.db_host
}

output "read_replica_endpoints" {
  description = "List of endpoint URLs for read replica databases for high-volume read operations"
  value       = [for replica in supabase_replica.read_replicas : replica.endpoint]
}

output "database_name" {
  description = "The name of the provisioned Supabase PostgreSQL database"
  value       = supabase_project.main.db_name
}

output "database_port" {
  description = "The port number for database connections"
  value       = supabase_project.main.db_port
}

output "database_user" {
  description = "The master username of the Supabase PostgreSQL database"
  value       = supabase_project.main.db_user
  sensitive   = true
}

output "supabase_project_id" {
  description = "The Supabase project ID for referencing in other resources"
  value       = supabase_project.main.id
}

output "supabase_anon_key" {
  description = "The Supabase anonymous key for client-side connections"
  value       = supabase_project.main.anon_key
  sensitive   = true
}

output "supabase_service_role_key" {
  description = "The Supabase service role key for server-side operations"
  value       = supabase_project.main.service_role_key
  sensitive   = true
}

output "connection_string" {
  description = "Formatted PostgreSQL connection string for the Supabase database"
  value       = "postgresql://${supabase_project.main.db_user}:${supabase_project.main.db_password}@${supabase_project.main.db_host}:${supabase_project.main.db_port}/${supabase_project.main.db_name}"
  sensitive   = true
}