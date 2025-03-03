provider "aws" {
  region = var.aws_region
}

provider "random" {
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

# Networking
resource "aws_vpc" "ai_services" {
  cidr_block           = var.vpc_cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = merge(local.common_tags, { Name = "${local.name_prefix}-ai-vpc" })
}

resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.ai_services.id
  cidr_block              = cidrsubnet(var.vpc_cidr_block, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.common_tags, { Name = "${local.name_prefix}-ai-public-${count.index+1}" })
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.ai_services.id
  cidr_block        = cidrsubnet(var.vpc_cidr_block, 8, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]
  tags              = merge(local.common_tags, { Name = "${local.name_prefix}-ai-private-${count.index+1}" })
}

resource "aws_internet_gateway" "ai_services" {
  vpc_id = aws_vpc.ai_services.id
  tags   = merge(local.common_tags, { Name = "${local.name_prefix}-ai-igw" })
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = merge(local.common_tags, { Name = "${local.name_prefix}-ai-nat-eip" })
}

resource "aws_nat_gateway" "ai_services" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = merge(local.common_tags, { Name = "${local.name_prefix}-ai-nat" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.ai_services.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.ai_services.id
  }
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-ai-public-rt" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.ai_services.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.ai_services.id
  }
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-ai-private-rt" })
}

resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Security Groups
resource "aws_security_group" "ai_services" {
  name        = "${local.name_prefix}-ai-services-sg"
  description = "Security group for AI Services"
  vpc_id      = aws_vpc.ai_services.id

  ingress {
    description     = "HTTP from load balancer"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.ai_lb.id]
  }

  ingress {
    description = "Llama model port"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Mistral model port"
    from_port   = 5001
    to_port     = 5001
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-ai-services-sg" })
}

resource "aws_security_group" "ai_lb" {
  name        = "${local.name_prefix}-ai-lb-sg"
  description = "Security group for AI Services Load Balancer"
  vpc_id      = aws_vpc.ai_services.id

  ingress {
    description = "HTTP from VPC"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-ai-lb-sg" })
}

# ECS Cluster
resource "aws_ecs_cluster" "ai_services" {
  name = "${local.name_prefix}-ai-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "ai_services" {
  name        = "${local.name_prefix}-ai.local"
  vpc         = aws_vpc.ai_services.id
  description = "Service discovery namespace for AI services"
  tags        = local.common_tags
}

resource "aws_service_discovery_service" "llama" {
  name = "llama"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.ai_services.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = local.common_tags
}

resource "aws_service_discovery_service" "mistral" {
  name = "mistral"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.ai_services.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = local.common_tags
}

resource "aws_service_discovery_service" "ai_router" {
  name = "ai-router"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.ai_services.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = local.common_tags
}

# EFS for Model Data
resource "aws_efs_file_system" "model_data" {
  creation_token = "${local.name_prefix}-model-data"
  throughput_mode = var.efs_throughput_mode
  provisioned_throughput_in_mibps = var.efs_throughput_mode == "provisioned" ? var.efs_provisioned_throughput : null
  performance_mode = "generalPurpose"
  encrypted        = true
  
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
  
  tags = merge(local.common_tags, { Name = "${local.name_prefix}-model-data" })
}

resource "aws_efs_mount_target" "model_data" {
  count           = length(var.availability_zones)
  file_system_id  = aws_efs_file_system.model_data.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_security_group" "efs" {
  name        = "${local.name_prefix}-efs-sg"
  description = "Security group for EFS access"
  vpc_id      = aws_vpc.ai_services.id

  ingress {
    description     = "NFS from AI services"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ai_services.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-efs-sg" })
}

# ECR Repositories
resource "aws_ecr_repository" "llama" {
  name                 = "${local.name_prefix}-llama"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = local.common_tags
}

resource "aws_ecr_repository" "mistral" {
  name                 = "${local.name_prefix}-mistral"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = local.common_tags
}

resource "aws_ecr_repository" "ai_router" {
  name                 = "${local.name_prefix}-ai-router"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = local.common_tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "llama" {
  name              = "/ecs/${local.name_prefix}-llama"
  retention_in_days = var.cloudwatch_log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "mistral" {
  name              = "/ecs/${local.name_prefix}-mistral"
  retention_in_days = var.cloudwatch_log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "ai_router" {
  name              = "/ecs/${local.name_prefix}-ai-router"
  retention_in_days = var.cloudwatch_log_retention_days
  tags              = local.common_tags
}

# IAM Roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "${local.name_prefix}-ecs-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${local.name_prefix}-ecs-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "ecs_task_policy" {
  name        = "${local.name_prefix}-ecs-task-policy"
  description = "Policy for ECS tasks to access required AWS resources"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ]
        Resource = aws_efs_file_system.model_data.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.llama.arn,
          aws_cloudwatch_log_group.mistral.arn,
          aws_cloudwatch_log_group.ai_router.arn,
          "${aws_cloudwatch_log_group.llama.arn}:*",
          "${aws_cloudwatch_log_group.mistral.arn}:*",
          "${aws_cloudwatch_log_group.ai_router.arn}:*"
        ]
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_policy.arn
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "llama" {
  family                   = "${local.name_prefix}-llama"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.llama_task_cpu
  memory                   = var.llama_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  volume {
    name = "model-data"
    
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.model_data.id
      root_directory     = "/"
      transit_encryption = "ENABLED"
    }
  }
  
  container_definitions = jsonencode([{
    name = "${local.name_prefix}-llama"
    image = "${aws_ecr_repository.llama.repository_url}:latest"
    essential = true
    cpu = var.llama_task_cpu
    memory = var.llama_task_memory
    environment = [
      { name = "PORT", value = "8080" },
      { name = "MAX_BATCH_SIZE", value = "8" },
      { name = "MAX_SEQUENCE_LENGTH", value = "2048" },
      { name = "MODEL_PATH", value = "/app/models" }
    ]
    mountPoints = [{
      sourceVolume = "model-data"
      containerPath = "/app/models"
      readOnly = false
    }]
    portMappings = [{
      containerPort = 8080
      hostPort = 8080
      protocol = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group" = aws_cloudwatch_log_group.llama.name
        "awslogs-region" = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval = 30
      timeout = 5
      retries = 3
      startPeriod = 60
    }
  }])
  
  tags = local.common_tags
}

resource "aws_ecs_task_definition" "mistral" {
  family                   = "${local.name_prefix}-mistral"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.mistral_task_cpu
  memory                   = var.mistral_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  volume {
    name = "model-data"
    
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.model_data.id
      root_directory     = "/"
      transit_encryption = "ENABLED"
    }
  }
  
  container_definitions = jsonencode([{
    name = "${local.name_prefix}-mistral"
    image = "${aws_ecr_repository.mistral.repository_url}:latest"
    essential = true
    cpu = var.mistral_task_cpu
    memory = var.mistral_task_memory
    environment = [
      { name = "PORT", value = "5001" },
      { name = "MAX_BATCH_SIZE", value = "8" },
      { name = "MAX_INPUT_LENGTH", value = "4096" },
      { name = "MODEL_PATH", value = "/app/models" }
    ]
    mountPoints = [{
      sourceVolume = "model-data"
      containerPath = "/app/models"
      readOnly = false
    }]
    portMappings = [{
      containerPort = 5001
      hostPort = 5001
      protocol = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group" = aws_cloudwatch_log_group.mistral.name
        "awslogs-region" = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command = ["CMD-SHELL", "curl -f http://localhost:5001/health || exit 1"]
      interval = 30
      timeout = 5
      retries = 3
      startPeriod = 60
    }
  }])
  
  tags = local.common_tags
}

resource "aws_ecs_task_definition" "ai_router" {
  family                   = "${local.name_prefix}-ai-router"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.router_task_cpu
  memory                   = var.router_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([{
    name = "${local.name_prefix}-ai-router"
    image = "${aws_ecr_repository.ai_router.repository_url}:latest"
    essential = true
    cpu = var.router_task_cpu
    memory = var.router_task_memory
    environment = [
      { name = "PORT", value = "3000" },
      { name = "NODE_ENV", value = "production" },
      { name = "LLAMA_SERVICE_URL", value = "http://llama.${aws_service_discovery_private_dns_namespace.ai_services.name}:8080" },
      { name = "MISTRAL_SERVICE_URL", value = "http://mistral.${aws_service_discovery_private_dns_namespace.ai_services.name}:5001" },
      { name = "DEEPSEEK_API_KEY", value = var.deepseek_api_key },
      { name = "HUGGINGFACE_API_KEY", value = var.huggingface_api_key },
      { name = "LOG_LEVEL", value = "info" },
      { name = "CACHE_ENABLED", value = "true" },
      { name = "FALLBACK_ENABLED", value = "true" }
    ]
    portMappings = [{
      containerPort = 3000
      hostPort = 3000
      protocol = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group" = aws_cloudwatch_log_group.ai_router.name
        "awslogs-region" = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval = 30
      timeout = 5
      retries = 3
      startPeriod = 30
    }
  }])
  
  tags = local.common_tags
}

# Load Balancer
resource "aws_lb" "ai_services" {
  name               = "${local.name_prefix}-ai-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.ai_lb.id]
  subnets            = aws_subnet.public.*.id
  
  enable_deletion_protection = var.environment == "production"
  
  tags = local.common_tags
}

resource "aws_lb_target_group" "ai_router" {
  name        = "${local.name_prefix}-ai-router-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.ai_services.id
  target_type = "ip"
  
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
  
  tags = local.common_tags
}

resource "aws_lb_listener" "ai_services_http" {
  load_balancer_arn = aws_lb.ai_services.arn
  port              = 80
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ai_router.arn
  }
  
  tags = local.common_tags
}

# ECS Services
resource "aws_ecs_service" "llama" {
  name                              = "${local.name_prefix}-llama"
  cluster                           = aws_ecs_cluster.ai_services.id
  task_definition                   = aws_ecs_task_definition.llama.arn
  desired_count                     = var.llama_service_count
  launch_type                       = "FARGATE"
  platform_version                  = "LATEST"
  scheduling_strategy               = "REPLICA"
  
  service_registries {
    registry_arn = aws_service_discovery_service.llama.arn
    port         = 8080
  }
  
  network_configuration {
    subnets          = aws_subnet.private.*.id
    security_groups  = [aws_security_group.ai_services.id]
    assign_public_ip = false
  }
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  
  tags = local.common_tags
}

resource "aws_ecs_service" "mistral" {
  name                              = "${local.name_prefix}-mistral"
  cluster                           = aws_ecs_cluster.ai_services.id
  task_definition                   = aws_ecs_task_definition.mistral.arn
  desired_count                     = var.mistral_service_count
  launch_type                       = "FARGATE"
  platform_version                  = "LATEST"
  scheduling_strategy               = "REPLICA"
  
  service_registries {
    registry_arn = aws_service_discovery_service.mistral.arn
    port         = 5001
  }
  
  network_configuration {
    subnets          = aws_subnet.private.*.id
    security_groups  = [aws_security_group.ai_services.id]
    assign_public_ip = false
  }
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  
  tags = local.common_tags
}

resource "aws_ecs_service" "ai_router" {
  name                              = "${local.name_prefix}-ai-router"
  cluster                           = aws_ecs_cluster.ai_services.id
  task_definition                   = aws_ecs_task_definition.ai_router.arn
  desired_count                     = var.router_service_count
  launch_type                       = "FARGATE"
  platform_version                  = "LATEST"
  scheduling_strategy               = "REPLICA"
  
  service_registries {
    registry_arn = aws_service_discovery_service.ai_router.arn
    port         = 3000
  }
  
  network_configuration {
    subnets          = aws_subnet.private.*.id
    security_groups  = [aws_security_group.ai_services.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.ai_router.arn
    container_name   = "${local.name_prefix}-ai-router"
    container_port   = 3000
  }
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  
  tags = local.common_tags
}

# Autoscaling
resource "aws_appautoscaling_target" "llama" {
  count              = var.enable_model_auto_scaling ? 1 : 0
  max_capacity       = var.model_scaling_max_capacity
  min_capacity       = var.model_scaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.ai_services.name}/${aws_ecs_service.llama.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_target" "mistral" {
  count              = var.enable_model_auto_scaling ? 1 : 0
  max_capacity       = var.model_scaling_max_capacity
  min_capacity       = var.model_scaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.ai_services.name}/${aws_ecs_service.mistral.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_target" "ai_router" {
  count              = var.enable_model_auto_scaling ? 1 : 0
  max_capacity       = var.model_scaling_max_capacity
  min_capacity       = var.model_scaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.ai_services.name}/${aws_ecs_service.ai_router.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "llama_cpu" {
  count              = var.enable_model_auto_scaling ? 1 : 0
  name               = "${local.name_prefix}-llama-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.llama[0].resource_id
  scalable_dimension = aws_appautoscaling_target.llama[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.llama[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    target_value       = var.model_scaling_cpu_threshold
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "mistral_cpu" {
  count              = var.enable_model_auto_scaling ? 1 : 0
  name               = "${local.name_prefix}-mistral-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.mistral[0].resource_id
  scalable_dimension = aws_appautoscaling_target.mistral[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.mistral[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    target_value       = var.model_scaling_cpu_threshold
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "ai_router_cpu" {
  count              = var.enable_model_auto_scaling ? 1 : 0
  name               = "${local.name_prefix}-ai-router-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ai_router[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ai_router[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ai_router[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    target_value       = var.model_scaling_cpu_threshold
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "ai_services" {
  dashboard_name = "${local.name_prefix}-ai-services"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric",
        x = 0,
        y = 0,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/ECS", "CPUUtilization", "ServiceName", "${aws_ecs_service.llama.name}", "ClusterName", aws_ecs_cluster.ai_services.name ],
            [ "AWS/ECS", "CPUUtilization", "ServiceName", "${aws_ecs_service.mistral.name}", "ClusterName", aws_ecs_cluster.ai_services.name ],
            [ "AWS/ECS", "CPUUtilization", "ServiceName", "${aws_ecs_service.ai_router.name}", "ClusterName", aws_ecs_cluster.ai_services.name ]
          ],
          period = 300,
          stat = "Average",
          region = var.aws_region,
          title = "CPU Utilization"
        }
      },
      {
        type = "metric",
        x = 12,
        y = 0,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/ECS", "MemoryUtilization", "ServiceName", "${aws_ecs_service.llama.name}", "ClusterName", aws_ecs_cluster.ai_services.name ],
            [ "AWS/ECS", "MemoryUtilization", "ServiceName", "${aws_ecs_service.mistral.name}", "ClusterName", aws_ecs_cluster.ai_services.name ],
            [ "AWS/ECS", "MemoryUtilization", "ServiceName", "${aws_ecs_service.ai_router.name}", "ClusterName", aws_ecs_cluster.ai_services.name ]
          ],
          period = 300,
          stat = "Average",
          region = var.aws_region,
          title = "Memory Utilization"
        }
      },
      {
        type = "metric",
        x = 0,
        y = 6,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.ai_services.arn_suffix ],
            [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.ai_services.arn_suffix ]
          ],
          period = 300,
          stat = "Average",
          region = var.aws_region,
          title = "API Response Time and Request Count"
        }
      },
      {
        type = "metric",
        x = 12,
        y = 6,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            [ "AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", aws_lb.ai_services.arn_suffix ],
            [ "AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", aws_lb.ai_services.arn_suffix ],
            [ "AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.ai_services.arn_suffix ]
          ],
          period = 300,
          stat = "Sum",
          region = var.aws_region,
          title = "HTTP Status Codes"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

# Outputs
output "ai_router_endpoint" {
  description = "The endpoint URL for the AI Router service for integration with the application"
  value       = "http://${aws_lb.ai_services.dns_name}"
}

output "ai_services_load_balancer_dns" {
  description = "DNS name of the AI services load balancer for application configuration"
  value       = aws_lb.ai_services.dns_name
}

output "ai_services_security_group_id" {
  description = "Security group ID for AI services to be used in client application configuration"
  value       = aws_security_group.ai_services.id
}

output "ai_ecr_repositories" {
  description = "Map of ECR repository URIs for CI/CD pipeline configuration"
  value       = {
    llama     = aws_ecr_repository.llama.repository_url
    mistral   = aws_ecr_repository.mistral.repository_url
    ai_router = aws_ecr_repository.ai_router.repository_url
  }
}

output "ai_services_cluster_id" {
  description = "ECS cluster ID for AI services for monitoring and management"
  value       = aws_ecs_cluster.ai_services.id
}

output "model_data_efs_id" {
  description = "EFS file system ID for AI model data for management and backup"
  value       = aws_efs_file_system.model_data.id
}