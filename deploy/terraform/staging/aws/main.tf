terraform {
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_db_instance" "cryptobom_staging" {
  engine = "postgres"
  instance_class = var.instance_class
  allocated_storage = var.allocated_storage
  name = var.db_name
  username = var.db_user
  password = var.db_password
  skip_final_snapshot = true
  publicly_accessible = false
}

output "db_endpoint" {
  value = aws_db_instance.cryptobom_staging.address
}
