# CryptoBOM — GCP staging environment
# Usage: terraform plan -var-file=environments/staging.tfvars

gcp_project_id = "cryptobom-staging" # TODO: replace with actual project ID
gcp_region     = "europe-west3"
environment    = "staging"

gke_subnet_cidr   = "10.10.0.0/20"
gke_pods_cidr     = "10.20.0.0/14"
gke_services_cidr = "10.30.0.0/20"
gke_master_cidr   = "172.16.0.0/28"
db_subnet_cidr    = "10.40.0.0/24"

enterprise_machine_type = "n2-standard-2"
enterprise_node_count   = 2
enterprise_min_nodes    = 1
enterprise_max_nodes    = 4
oss_machine_type        = "e2-standard-2"
oss_node_count          = 1
oss_max_nodes           = 3

db_tier         = "db-custom-2-8192"
redis_memory_gb = 2

authorized_networks = [
  { cidr = "10.0.0.0/8", name = "internal" },
  { cidr = "0.0.0.0/0", name = "staging-ci" } # lock down when stable
]
