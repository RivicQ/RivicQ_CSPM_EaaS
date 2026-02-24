terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name"
  default     = "production"
}

variable "project" {
  description = "Project name"
  default     = "cryptobom"
}

# VPC for CloudHSM
resource "aws_vpc" "cryptobom" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project}-vpc-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_subnet" "cryptobom_private" {
  count             = 2
  vpc_id            = aws_vpc.cryptobom.id
  cidr_block        = cidrsubnet("10.1.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "${var.project}-private-${count.index}-${var.environment}"
    Environment = var.environment
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# AWS CloudHSM Cluster
resource "aws_cloudhsm_v2_cluster" "cryptobom" {
  hsm_type   = "hsm1.medium"
  subnet_ids = aws_subnet.cryptobom_private[*].id

  tags = {
    Name        = "${var.project}-hsm-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
    Compliance  = "fips-140-3"
  }
}

resource "aws_cloudhsm_v2_hsm" "cryptobom" {
  cluster_id        = aws_cloudhsm_v2_cluster.cryptobom.cluster_id
  subnet_id         = aws_subnet.cryptobom_private[0].id
  availability_zone = data.aws_availability_zones.available.names[0]
}

# AWS KMS Master Key
resource "aws_kms_key" "cryptobom_master" {
  description              = "CryptoBOM master encryption key"
  deletion_window_in_days  = 30
  enable_key_rotation      = true
  multi_region             = false
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  key_usage                = "ENCRYPT_DECRYPT"

  tags = {
    Name        = "${var.project}-kms-master-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_alias" "cryptobom_master" {
  name          = "alias/${var.project}-master-${var.environment}"
  target_key_id = aws_kms_key.cryptobom_master.key_id
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "cryptobom" {
  name       = "${var.project}-db-subnet-${var.environment}"
  subnet_ids = aws_subnet.cryptobom_private[*].id

  tags = {
    Name        = "${var.project}-db-subnet-group"
    Environment = var.environment
  }
}

resource "aws_db_instance" "cryptobom" {
  identifier             = "${var.project}-db-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.medium"
  allocated_storage      = 20
  max_allocated_storage  = 100
  db_name                = "cryptobom"
  username               = "cryptobom_admin"
  manage_master_user_password = true
  db_subnet_group_name   = aws_db_subnet_group.cryptobom.name
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.cryptobom_master.arn
  backup_retention_period = 7
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project}-db-final-${var.environment}"

  tags = {
    Name        = "${var.project}-db-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# S3 Bucket for artifacts
resource "aws_s3_bucket" "cryptobom_artifacts" {
  bucket = "${var.project}-artifacts-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-artifacts-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cryptobom_artifacts" {
  bucket = aws_s3_bucket.cryptobom_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.cryptobom_master.arn
    }
  }
}

resource "aws_s3_bucket_versioning" "cryptobom_artifacts" {
  bucket = aws_s3_bucket.cryptobom_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "cryptobom_audit" {
  name                          = "${var.project}-audit-${var.environment}"
  s3_bucket_name                = aws_s3_bucket.cryptobom_artifacts.id
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = false
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cryptobom_master.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = {
    Name        = "${var.project}-cloudtrail-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

data "aws_caller_identity" "current" {}

# Outputs
output "cloudhsm_cluster_id" {
  description = "CloudHSM cluster ID"
  value       = aws_cloudhsm_v2_cluster.cryptobom.cluster_id
}

output "kms_key_arn" {
  description = "KMS master key ARN"
  value       = aws_kms_key.cryptobom_master.arn
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.cryptobom.endpoint
  sensitive   = true
}
