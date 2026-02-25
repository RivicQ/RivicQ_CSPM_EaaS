terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "cryptobom-terraform-state"
    key    = "aws/terraform.tfstate"
    region = "eu-central-1"
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  default_tags {
    tags = {
      Project     = "CryptoBOM"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "cryptobom" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "cryptobom-${var.environment}" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.cryptobom.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "${var.aws_region}a"

  tags = { Name = "cryptobom-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.cryptobom.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "${var.aws_region}b"

  tags = { Name = "cryptobom-private-b" }
}

# ── AWS CloudHSM Cluster ─────────────────────────────────────────────────────

resource "aws_cloudhsm_v2_cluster" "cryptobom_hsm" {
  hsm_type   = "hsm1.medium"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name    = "cryptobom-hsm-${var.environment}"
    Purpose = "CryptoBOM key management"
  }
}

resource "aws_cloudhsm_v2_hsm" "cryptobom_hsm_primary" {
  cluster_id        = aws_cloudhsm_v2_cluster.cryptobom_hsm.cluster_id
  subnet_id         = aws_subnet.private_a.id
  availability_zone = "${var.aws_region}a"
}

# ── AWS KMS ──────────────────────────────────────────────────────────────────

resource "aws_kms_key" "cryptobom_master" {
  description              = "CryptoBOM master encryption key - ${var.environment}"
  deletion_window_in_days  = 30
  enable_key_rotation      = true
  multi_region             = true
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  key_usage                = "ENCRYPT_DECRYPT"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "Enable IAM Policies"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.aws_account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "cryptobom_master" {
  name          = "alias/cryptobom-master-${var.environment}"
  target_key_id = aws_kms_key.cryptobom_master.key_id
}

resource "aws_kms_key" "cryptobom_rds" {
  description             = "CryptoBOM RDS encryption key - ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "cryptobom_rds" {
  name          = "alias/cryptobom-rds-${var.environment}"
  target_key_id = aws_kms_key.cryptobom_rds.key_id
}

# ── RDS PostgreSQL ───────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "cryptobom" {
  name       = "cryptobom-${var.environment}"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_security_group" "rds" {
  name   = "cryptobom-rds-${var.environment}"
  vpc_id = aws_vpc.cryptobom.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.1.0.0/16"]
  }
}

resource "aws_db_instance" "cryptobom_db" {
  identifier            = "cryptobom-${var.environment}"
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = "db.t3.medium"
  allocated_storage     = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.cryptobom_rds.arn
  db_name               = "cryptobom"
  username              = "cryptobom"
  password              = var.db_password
  db_subnet_group_name  = aws_db_subnet_group.cryptobom.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az              = var.environment == "production"
  deletion_protection   = var.environment == "production"
  backup_retention_period = 7
  skip_final_snapshot   = var.environment != "production"

  tags = { Name = "cryptobom-${var.environment}" }
}

# ── S3 Buckets ───────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "cryptobom_artifacts" {
  bucket = "cryptobom-artifacts-${var.environment}-${var.aws_account_id}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.cryptobom_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.cryptobom_master.arn
    }
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.cryptobom_artifacts.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.cryptobom_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── CloudTrail ───────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "cloudtrail" {
  bucket = "cryptobom-cloudtrail-${var.environment}-${var.aws_account_id}"
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${var.aws_account_id}/*"
        Condition = {
          StringEquals = { "s3:x-amz-acl" = "bucket-owner-full-control" }
        }
      }
    ]
  })
}

resource "aws_cloudtrail" "cryptobom_audit" {
  name                          = "cryptobom-audit-${var.environment}"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cryptobom_master.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::KMS::Key"
      values = ["arn:aws:kms"]
    }
  }
}

# ── Outputs ──────────────────────────────────────────────────────────────────

output "cloudhsm_cluster_id" {
  value = aws_cloudhsm_v2_cluster.cryptobom_hsm.cluster_id
}

output "kms_master_key_arn" {
  value     = aws_kms_key.cryptobom_master.arn
  sensitive = true
}

output "rds_endpoint" {
  value = aws_db_instance.cryptobom_db.endpoint
}

output "artifacts_bucket" {
  value = aws_s3_bucket.cryptobom_artifacts.bucket
}
