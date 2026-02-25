# ============================================================
# CryptoBOM SaaS — GCP Enterprise Platform
# Terraform: Google Cloud Platform
# Regions: europe-west3 (Frankfurt) primary — BSI/DORA jurisdiction
# ============================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "gcs" {
    # bucket and prefix are supplied via -backend-config at init time
    # e.g. terraform init -backend-config=environments/prod.backend.hcl
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region

  default_labels = {
    project     = "cryptobom-saas"
    environment = var.environment
    managed_by  = "terraform"
    compliance  = "bsi-dora-eidas"
  }
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# ============================================================
# VPC Network
# ============================================================
resource "google_compute_network" "cryptobom_vpc" {
  name                    = "cryptobom-${var.environment}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  description             = "CryptoBOM SaaS VPC - ${var.environment}"
}

resource "google_compute_subnetwork" "gke_subnet" {
  name                     = "cryptobom-gke-subnet-${var.environment}"
  ip_cidr_range            = var.gke_subnet_cidr
  region                   = var.gcp_region
  network                  = google_compute_network.cryptobom_vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = var.gke_pods_cidr
  }
  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = var.gke_services_cidr
  }

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_subnetwork" "db_subnet" {
  name          = "cryptobom-db-subnet-${var.environment}"
  ip_cidr_range = var.db_subnet_cidr
  region        = var.gcp_region
  network       = google_compute_network.cryptobom_vpc.id
}

# Cloud NAT for private GKE nodes
resource "google_compute_router" "router" {
  name    = "cryptobom-router-${var.environment}"
  region  = var.gcp_region
  network = google_compute_network.cryptobom_vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "cryptobom-nat-${var.environment}"
  router                             = google_compute_router.router.name
  region                             = var.gcp_region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.gke_subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ============================================================
# GKE Cluster (Autopilot for enterprise, Standard for OSS)
# ============================================================
resource "google_container_cluster" "cryptobom" {
  provider = google-beta

  name     = "cryptobom-${var.environment}"
  location = var.gcp_region

  # Use dedicated node pool (remove default)
  initial_node_count       = 1
  remove_default_node_pool = true

  network    = google_compute_network.cryptobom_vpc.id
  subnetwork = google_compute_subnetwork.gke_subnet.id

  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.gke_master_cidr
  }

  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.authorized_networks
      content {
        cidr_block   = cidr_blocks.value.cidr
        display_name = cidr_blocks.value.name
      }
    }
  }

  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }

  addons_config {
    horizontal_pod_autoscaling { disabled = false }
    http_load_balancing { disabled = false }
    gce_persistent_disk_csi_driver_config { enabled = true }
    gcs_fuse_csi_driver_config { enabled = true }
  }

  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_ENTERPRISE"
  }

  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T02:00:00Z"
      end_time   = "2024-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  release_channel {
    channel = "STABLE"
  }

  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"

  deletion_protection = var.environment == "production" ? true : false

  resource_labels = {
    environment = var.environment
    product     = "cryptobom"
  }
}

# Enterprise Node Pool
resource "google_container_node_pool" "enterprise" {
  name       = "cryptobom-enterprise-pool"
  cluster    = google_container_cluster.cryptobom.id
  location   = var.gcp_region
  node_count = var.enterprise_node_count

  autoscaling {
    min_node_count  = var.enterprise_min_nodes
    max_node_count  = var.enterprise_max_nodes
    location_policy = "BALANCED"
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  node_config {
    machine_type = var.enterprise_machine_type # n2-standard-4
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    image_type   = "COS_CONTAINERD"

    service_account = google_service_account.gke_node_sa.email

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      workload = "cryptobom-enterprise"
      env      = var.environment
    }

    taint {
      key    = "workload"
      value  = "enterprise"
      effect = "NO_SCHEDULE"
    }
  }
}

# OSS Node Pool
resource "google_container_node_pool" "oss" {
  name       = "cryptobom-oss-pool"
  cluster    = google_container_cluster.cryptobom.id
  location   = var.gcp_region
  node_count = var.oss_node_count

  autoscaling {
    min_node_count = 1
    max_node_count = var.oss_max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.oss_machine_type # e2-standard-2
    disk_size_gb = 50
    disk_type    = "pd-balanced"
    image_type   = "COS_CONTAINERD"

    service_account = google_service_account.gke_node_sa.email

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# ============================================================
# Service Accounts & Workload Identity
# ============================================================
resource "google_service_account" "gke_node_sa" {
  account_id   = "cryptobom-gke-node-${var.environment}"
  display_name = "CryptoBOM GKE Node Service Account"
}

resource "google_service_account" "cryptobom_app_sa" {
  account_id   = "cryptobom-app-${var.environment}"
  display_name = "CryptoBOM Application Service Account"
}

# Workload Identity binding — allows K8s SA to use GCP SA
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.cryptobom_app_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.gcp_project_id}.svc.id.goog[cryptobom/cryptobom-app]"
}

resource "google_project_iam_member" "app_kms" {
  project = var.gcp_project_id
  role    = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member  = "serviceAccount:${google_service_account.cryptobom_app_sa.email}"
}

resource "google_project_iam_member" "app_secretmanager" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cryptobom_app_sa.email}"
}

resource "google_project_iam_member" "app_logging" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cryptobom_app_sa.email}"
}

resource "google_project_iam_member" "app_monitoring" {
  project = var.gcp_project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.cryptobom_app_sa.email}"
}

# ============================================================
# Cloud SQL (PostgreSQL 15) — CMEK encrypted
# ============================================================
resource "google_sql_database_instance" "cryptobom_db" {
  name             = "cryptobom-${var.environment}-pg15"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  encryption_key_name = google_kms_crypto_key.db_encryption_key.id

  settings {
    tier              = var.db_tier # db-custom-4-16384
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.cryptobom_vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }
    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }
    database_flags {
      name  = "ssl_min_protocol_version"
      value = "TLSv1.3"
    }

    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 4096
      record_application_tags = true
      record_client_address   = false
    }
  }

  deletion_protection = var.environment == "production" ? true : false
  depends_on          = [google_service_networking_connection.private_vpc_connection]
}

resource "google_sql_database" "cryptobom" {
  name     = "cryptobom"
  instance = google_sql_database_instance.cryptobom_db.name
}

resource "google_sql_user" "cryptobom_app" {
  name     = "cryptobom_app"
  instance = google_sql_database_instance.cryptobom_db.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store DB password in Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "cryptobom-db-password-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# Private service connection for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "cryptobom-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.cryptobom_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.cryptobom_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# ============================================================
# Cloud KMS + Cloud HSM
# ============================================================
resource "google_kms_key_ring" "cryptobom_keyring" {
  provider = google-beta
  name     = "cryptobom-${var.environment}-keyring"
  location = var.gcp_region
}

# DB encryption key (HSM-backed)
resource "google_kms_crypto_key" "db_encryption_key" {
  provider        = google-beta
  name            = "cryptobom-db-encryption-key"
  key_ring        = google_kms_key_ring.cryptobom_keyring.id
  purpose         = "ENCRYPT_DECRYPT"
  rotation_period = "7776000s" # 90 days

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM" # Hardware Security Module
  }

  labels = {
    purpose = "database-encryption"
    fips    = "140-3"
  }
}

# JWT signing key (RSA-4096 HSM-backed)
resource "google_kms_crypto_key" "jwt_signing_key" {
  provider = google-beta
  name     = "cryptobom-jwt-signing-key"
  key_ring = google_kms_key_ring.cryptobom_keyring.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "RSA_SIGN_PSS_4096_SHA512"
    protection_level = "HSM"
  }

  labels = {
    purpose = "jwt-signing"
  }
}

# Quantum-safe key (ML-KEM / pre-provision placeholder)
resource "google_kms_crypto_key" "pqc_key" {
  provider = google-beta
  name     = "cryptobom-pqc-key"
  key_ring = google_kms_key_ring.cryptobom_keyring.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  labels = {
    purpose   = "post-quantum"
    pqc_ready = "true"
  }
}

# ============================================================
# Memorystore Redis (session cache)
# ============================================================
resource "google_redis_instance" "cryptobom_cache" {
  name           = "cryptobom-cache-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.redis_memory_gb

  location_id             = "${var.gcp_region}-a"
  alternative_location_id = var.environment == "production" ? "${var.gcp_region}-b" : null

  authorized_network = google_compute_network.cryptobom_vpc.id

  redis_version           = "REDIS_7_0"
  display_name            = "CryptoBOM Cache ${var.environment}"
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
}

# ============================================================
# Secret Manager — application secrets
# ============================================================
locals {
  secrets = {
    "cryptobom-jwt-secret"      = "MANAGED_BY_HSM"
    "cryptobom-ibm-quantum-key" = var.ibm_quantum_api_key
    "cryptobom-ibm-cloud-key"   = var.ibm_cloud_api_key
    "cryptobom-slack-webhook"   = var.slack_webhook_url
    "cryptobom-stripe-secret"   = var.stripe_secret_key
    "cryptobom-stripe-webhook"  = var.stripe_webhook_secret
  }
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each  = local.secrets
  secret_id = "${each.key}-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "app_secrets" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.app_secrets[each.key].id
  secret_data = each.value
}
