# AI Router Service Endpoint
output "ai_router_endpoint" {
  description = "The endpoint URL for the AI Router service"
  value       = "http://${aws_lb.ai_services.dns_name}"
}

# Load Balancer DNS
output "ai_services_load_balancer_dns" {
  description = "The DNS name of the load balancer for AI services"
  value       = aws_lb.ai_services.dns_name
}

# Security Group
output "ai_services_security_group_id" {
  description = "The ID of the security group for AI services"
  value       = aws_security_group.ai_services.id
}

# ECR Repositories
output "ai_ecr_repositories" {
  description = "Map of ECR repositories for AI service images"
  value       = {
    llama     = aws_ecr_repository.llama.repository_url
    mistral   = aws_ecr_repository.mistral.repository_url
    ai_router = aws_ecr_repository.ai_router.repository_url
  }
}

# ECS Cluster
output "ai_services_cluster_id" {
  description = "The ID of the ECS cluster for AI services"
  value       = aws_ecs_cluster.ai_services.id
}

# EFS File System for Model Data
output "model_data_efs_id" {
  description = "The ID of the EFS file system for model data"
  value       = aws_efs_file_system.model_data.id
}