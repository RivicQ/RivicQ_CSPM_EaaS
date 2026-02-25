variable "environment" {
  description = "Deployment environment"
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  default     = "eu-central-1"
}

variable "aws_access_key" {
  description = "AWS access key"
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret key"
  sensitive   = true
}

variable "aws_account_id" {
  description = "AWS account ID"
}

variable "db_password" {
  description = "RDS PostgreSQL password"
  sensitive   = true
}
