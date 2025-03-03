# Configures Terraform's remote state storage in AWS S3 with DynamoDB state locking
# This enables team collaboration and maintains state consistency across deployments

terraform {
  # Specify minimum required Terraform version
  required_version = "~> 1.5"
  
  backend "s3" {
    # S3 bucket for storing Terraform state files
    bucket = "engagerr-terraform-state"
    
    # NOTE: This is a placeholder path. For environment-specific state, use:
    # - CLI override: terraform init -backend-config="key=environments/dev/terraform.tfstate"
    # - Or define a fixed environment path here
    key = "environments/terraform.tfstate"
    
    # AWS region where the S3 bucket is located
    region = "us-east-1"
    
    # Enable encryption at rest for the state file
    encrypt = true
    
    # DynamoDB table for state locking to prevent concurrent modifications
    dynamodb_table = "engagerr-terraform-locks"
    
    # Access control for the S3 bucket
    acl = "private"
  }
}