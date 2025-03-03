variable "project_name" {
  type        = string
  description = "The name of the project, used for resource naming"
  default     = "engagerr"
}

variable "environment" {
  type        = string
  description = "The deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "region" {
  type        = string
  description = "The region where the Supabase project will be deployed"
  default     = "us-west-2"
}

variable "db_size" {
  type        = string
  description = "The size/tier of the database (small, medium, large, xlarge, etc.)"
  default     = "medium"
}

variable "storage_size_gb" {
  type        = number
  description = "The database storage size in GB"
  default     = 100
}

variable "postgres_version" {
  type        = string
  description = "The PostgreSQL version to use"
  default     = "15"
}

variable "enable_read_replicas" {
  type        = bool
  description = "Whether to enable read replicas for the database"
  default     = true
}

variable "read_replica_count" {
  type        = number
  description = "The number of read replicas to provision"
  default     = 2
}

variable "enable_point_in_time_recovery" {
  type        = bool
  description = "Whether to enable point-in-time recovery capability"
  default     = true
}

variable "backup_retention_days" {
  type        = number
  description = "The number of days to retain database backups"
  default     = 30
}

variable "max_connections" {
  type        = number
  description = "The maximum number of database connections"
  default     = 200
}

variable "enable_connection_pooling" {
  type        = bool
  description = "Whether to enable connection pooling using PgBouncer"
  default     = true
}

variable "pooler_mode" {
  type        = string
  description = "The connection pooling mode (transaction, session, statement)"
  default     = "transaction"
  validation {
    condition     = contains(["transaction", "session", "statement"], var.pooler_mode)
    error_message = "Pooler mode must be one of: transaction, session, statement"
  }
}

variable "auto_scaling_enabled" {
  type        = bool
  description = "Whether to enable auto-scaling capabilities for the database"
  default     = true
}

variable "auto_pause_enabled" {
  type        = bool
  description = "Whether to enable auto-pause for development environments to reduce costs"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources"
  default = {
    "project"     = "engagerr"
    "managed-by"  = "terraform"
    "application" = "content-analytics-platform"
  }
}