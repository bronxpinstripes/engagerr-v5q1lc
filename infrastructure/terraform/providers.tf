# Configure Terraform and required providers
terraform {
  # Require Terraform version 1.5.0 or higher and less than 1.6.0
  required_version = "~> 1.5"

  required_providers {
    # Vercel provider for application hosting
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }

    # AWS provider for containerized AI services and resources
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # HTTP provider for making API calls to external services
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }

    # Random provider for generating unique identifiers and values
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }

    # Null provider for dependency management and local operations
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }

    # TLS provider for certificate generation and verification
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Configure the Vercel provider for application hosting
provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team
}

# Configure the primary AWS provider for AI services
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
  
  default_tags {
    tags = {
      Project     = "Engagerr"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Configure a secondary AWS provider for global services (us-east-1 region)
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile
  
  default_tags {
    tags = {
      Project     = "Engagerr"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}