terraform {
  required_version = ">= 1.0"
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

resource "google_sql_database_instance" "cryptobom_staging" {
  name = var.instance_name
  database_version = "POSTGRES_15"
  settings {
    tier = var.tier
    disk_size = var.disk_size
  }
}

resource "google_sql_user" "cryptobom_user" {
  name = var.db_user
  instance = google_sql_database_instance.cryptobom_staging.name
  password = var.db_password
}

resource "google_sql_database" "cryptobom_db" {
  name = var.db_name
  instance = google_sql_database_instance.cryptobom_staging.name
}

output "connection_name" {
  value = google_sql_database_instance.cryptobom_staging.connection_name
}
