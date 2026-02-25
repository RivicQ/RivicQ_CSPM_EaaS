# CryptoBOM — GCP production environment
# Usage: terraform plan -var-file=environments/prod.tfvars

gcp_project_id = "cryptobom-prod" # TODO: replace with actual project ID
gcp_region     = "europe-west3"
environment    = "production"

gke_subnet_cidr   = "10.10.0.0/20"
gke_pods_cidr     = "10.20.0.0/14"
gke_services_cidr = "10.30.0.0/20"
gke_master_cidr   = "172.16.0.0/28"
db_subnet_cidr    = "10.40.0.0/24"

enterprise_machine_type = "n2-standard-4"
enterprise_node_count   = 3
enterprise_min_nodes    = 2
enterprise_max_nodes    = 10
oss_machine_type        = "e2-standard-2"
oss_node_count          = 2
oss_max_nodes           = 5

db_tier         = "db-custom-4-16384"
redis_memory_gb = 4

authorized_networks = [
  { cidr = "10.0.0.0/8", name = "internal" }
  # Add VPN/Interconnect CIDRs here for admin access
]
