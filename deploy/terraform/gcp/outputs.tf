output "gke_cluster_name" {
  value = google_container_cluster.cryptobom.name
}

output "gke_cluster_endpoint" {
  value     = google_container_cluster.cryptobom.endpoint
  sensitive = true
}

output "cloudsql_connection_name" {
  value = google_sql_database_instance.cryptobom_db.connection_name
}

output "cloudsql_private_ip" {
  value     = google_sql_database_instance.cryptobom_db.private_ip_address
  sensitive = true
}

output "redis_host" {
  value     = google_redis_instance.cryptobom_cache.host
  sensitive = true
}

output "redis_port" {
  value = google_redis_instance.cryptobom_cache.port
}

output "kms_keyring_id" {
  value = google_kms_key_ring.cryptobom_keyring.id
}

output "kms_db_key_id" {
  value = google_kms_crypto_key.db_encryption_key.id
}

output "kms_jwt_key_id" {
  value = google_kms_crypto_key.jwt_signing_key.id
}

output "kms_pqc_key_id" {
  value = google_kms_crypto_key.pqc_key.id
}

output "app_service_account_email" {
  value = google_service_account.cryptobom_app_sa.email
}

output "vpc_id" {
  value = google_compute_network.cryptobom_vpc.id
}
