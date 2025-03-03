variable "project_name" {
  type        = string
  description = "Name of the project used for resource naming and tagging"
  default     = "engagerr"
  
  validation {
    condition     = length(var.project_name) > 0
    error_message = "Project name must not be empty"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region where AI services infrastructure will be deployed"
  default     = "us-east-1"
  
  validation {
    condition     = length(var.aws_region) > 0
    error_message = "AWS region must not be empty"
  }
}

variable "vpc_cidr_block" {
  type        = string
  description = "CIDR block for the VPC hosting AI services"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrnetmask(var.vpc_cidr_block))
    error_message = "VPC CIDR block must be a valid CIDR notation"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones to deploy across for high availability"
  default     = ["us-east-1a"]
  
  validation {
    condition     = length(var.availability_zones) > 0
    error_message = "At least one availability zone must be specified"
  }
}

variable "llama_image" {
  type        = string
  description = "Container image name for the Llama 3 model"
  default     = "engagerr-llama:latest"
}

variable "mistral_image" {
  type        = string
  description = "Container image name for the Mistral model"
  default     = "engagerr-mistral:latest"
}

variable "llama_task_cpu" {
  type        = number
  description = "CPU units allocated to each Llama 3 container task (in CPU units, 1024 = 1 vCPU)"
  default     = 4096
  
  validation {
    condition     = var.llama_task_cpu >= 1024
    error_message = "Llama task CPU must be at least 1024 (1 vCPU)"
  }
}

variable "llama_task_memory" {
  type        = number
  description = "Memory allocated to each Llama 3 container task (in MiB)"
  default     = 16384
  
  validation {
    condition     = var.llama_task_memory >= 4096
    error_message = "Llama task memory must be at least 4096 MiB (4 GB)"
  }
}

variable "mistral_task_cpu" {
  type        = number
  description = "CPU units allocated to each Mistral container task (in CPU units, 1024 = 1 vCPU)"
  default     = 2048
  
  validation {
    condition     = var.mistral_task_cpu >= 1024
    error_message = "Mistral task CPU must be at least 1024 (1 vCPU)"
  }
}

variable "mistral_task_memory" {
  type        = number
  description = "Memory allocated to each Mistral container task (in MiB)"
  default     = 8192
  
  validation {
    condition     = var.mistral_task_memory >= 2048
    error_message = "Mistral task memory must be at least 2048 MiB (2 GB)"
  }
}

variable "router_task_cpu" {
  type        = number
  description = "CPU units allocated to each AI Router container task (in CPU units, 1024 = 1 vCPU)"
  default     = 1024
  
  validation {
    condition     = var.router_task_cpu >= 512
    error_message = "Router task CPU must be at least 512 CPU units"
  }
}

variable "router_task_memory" {
  type        = number
  description = "Memory allocated to each AI Router container task (in MiB)"
  default     = 2048
  
  validation {
    condition     = var.router_task_memory >= 1024
    error_message = "Router task memory must be at least 1024 MiB (1 GB)"
  }
}

variable "llama_service_count" {
  type        = number
  description = "Number of Llama 3 container instances to deploy"
  default     = 1
  
  validation {
    condition     = var.llama_service_count > 0
    error_message = "At least one Llama service instance is required"
  }
}

variable "mistral_service_count" {
  type        = number
  description = "Number of Mistral container instances to deploy"
  default     = 1
  
  validation {
    condition     = var.mistral_service_count > 0
    error_message = "At least one Mistral service instance is required"
  }
}

variable "router_service_count" {
  type        = number
  description = "Number of AI Router container instances to deploy"
  default     = 1
  
  validation {
    condition     = var.router_service_count > 0
    error_message = "At least one Router service instance is required"
  }
}

variable "deepseek_api_key" {
  type        = string
  description = "API key for DeepSeek AI service"
  default     = ""
  sensitive   = true
}

variable "huggingface_api_key" {
  type        = string
  description = "API key for Hugging Face Inference API"
  default     = ""
  sensitive   = true
}

variable "enable_model_auto_scaling" {
  type        = bool
  description = "Whether to enable auto-scaling for AI model services"
  default     = true
}

variable "model_scaling_min_capacity" {
  type        = number
  description = "Minimum number of instances for auto-scaling"
  default     = 1
}

variable "model_scaling_max_capacity" {
  type        = number
  description = "Maximum number of instances for auto-scaling"
  default     = 5
}

variable "model_scaling_cpu_threshold" {
  type        = number
  description = "CPU utilization percentage that triggers scaling actions"
  default     = 70
}

variable "efs_throughput_mode" {
  type        = string
  description = "Throughput mode for EFS file system (bursting or provisioned)"
  default     = "bursting"
  
  validation {
    condition     = contains(["bursting", "provisioned"], var.efs_throughput_mode)
    error_message = "EFS throughput mode must be either bursting or provisioned"
  }
}

variable "efs_provisioned_throughput" {
  type        = number
  description = "Provisioned throughput in MiBps (only applicable when throughput_mode is provisioned)"
  default     = 0
}

variable "cloudwatch_log_retention_days" {
  type        = number
  description = "Number of days to retain CloudWatch logs"
  default     = 14
  
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.cloudwatch_log_retention_days)
    error_message = "CloudWatch log retention days must be one of the allowed values"
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags to apply to all resources"
  default     = {}
}