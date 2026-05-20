output "db_connection_string" {
  description = "Connection string for PostgreSQL"
  value = "postgresql://${var.db_user}:${var.db_password}@${aws_db_instance.cryptobom_staging.address}:${aws_db_instance.cryptobom_staging.port}/${var.db_name}"
}
