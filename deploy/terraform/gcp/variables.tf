# ============================================================
# CryptoBOM SaaS — GCP Terraform Variables
# ============================================================

variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region (primary datacenter — must be EU for BSI/DORA compliance)"
  type        = string
  default     = "europe-west3"  # Frankfurt
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Must be 'staging' or 'production'."
  }
}

variable "gke_subnet_cidr" { default = "10.10.0.0/20" }
variable "gke_pods_cidr"   { default = "10.20.0.0/14" }
variable "gke_services_cidr" { default = "10.30.0.0/20" }
variable "gke_master_cidr" { default = "172.16.0.0/28" }
variable "db_subnet_cidr"  { default = "10.40.0.0/24" }

variable "authorized_networks" {
  type = list(object({ cidr = string, name = string }))
  default = []
}

variable "enterprise_machine_type" { default = "n2-standard-4" }
variable "enterprise_node_count"   { default = 2 }
variable "enterprise_min_nodes"    { default = 2 }
variable "enterprise_max_nodes"    { default = 10 }
variable "oss_machine_type"        { default = "e2-standard-2" }
variable "oss_node_count"          { default = 1 }
variable "oss_max_nodes"           { default = 5 }

variable "db_tier"        { default = "db-custom-4-16384" }
variable "redis_memory_gb" { default = 4 }

variable "ibm_quantum_api_key" {
  type      = string
  sensitive = true
  default   = ""
}
variable "ibm_cloud_api_key" {
  type      = string
  sensitive = true
  default   = ""
}
variable "slack_webhook_url" {
  type      = string
  sensitive = true
  default   = ""
}
variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}
variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}