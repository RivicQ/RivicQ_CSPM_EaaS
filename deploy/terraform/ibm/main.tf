terraform {
  required_version = ">= 1.6.0"
  required_providers {
    ibm = {
      source  = "IBM-Cloud/ibm"
      version = "~> 1.60"
    }
  }
}

provider "ibm" {
  ibmcloud_api_key = var.ibm_api_key
  region           = var.ibm_region
}

# ── IBM Hyper Protect Crypto Services ────────────────────────────────────────

resource "ibm_resource_instance" "hpcs" {
  name              = "cryptobom-hpcs-${var.environment}"
  service           = "hs-crypto"
  plan              = "standard"
  location          = var.ibm_region
  resource_group_id = var.ibm_resource_group_id

  timeouts {
    create = "15m"
    update = "15m"
    delete = "15m"
  }
}

# ── IBM Cloud Object Storage ──────────────────────────────────────────────────

resource "ibm_resource_instance" "cos" {
  name              = "cryptobom-cos-${var.environment}"
  service           = "cloud-object-storage"
  plan              = "standard"
  location          = "global"
  resource_group_id = var.ibm_resource_group_id
}

resource "ibm_cos_bucket" "artifacts" {
  bucket_name          = "cryptobom-artifacts-${var.environment}"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = var.ibm_region
  storage_class        = "standard"

  key_protect = ibm_resource_instance.hpcs.id
}

resource "ibm_cos_bucket" "sbom_reports" {
  bucket_name          = "cryptobom-sbom-${var.environment}"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = var.ibm_region
  storage_class        = "standard"

  key_protect = ibm_resource_instance.hpcs.id
}

resource "ibm_cos_bucket" "audit_logs" {
  bucket_name          = "cryptobom-audit-${var.environment}"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = var.ibm_region
  storage_class        = "standard"

  key_protect = ibm_resource_instance.hpcs.id
}

# ── IBM Cloud Kubernetes Service ─────────────────────────────────────────────

resource "ibm_container_cluster" "cryptobom" {
  name              = "cryptobom-${var.environment}"
  datacenter        = var.ibm_datacenter
  machine_type      = "bx2.4x16"
  hardware          = "shared"
  default_pool_size = 2
  resource_group_id = var.ibm_resource_group_id

  kube_version = "1.28"

  timeouts {
    create = "60m"
    update = "60m"
    delete = "30m"
  }
}

# ── IBM Key Protect (backup key management) ───────────────────────────────────

resource "ibm_resource_instance" "key_protect" {
  name              = "cryptobom-keyprotect-${var.environment}"
  service           = "kms"
  plan              = "tiered-pricing"
  location          = var.ibm_region
  resource_group_id = var.ibm_resource_group_id
}

# ── Outputs ──────────────────────────────────────────────────────────────────

output "hpcs_instance_crn" {
  value     = ibm_resource_instance.hpcs.crn
  sensitive = true
}

output "cos_crn" {
  value = ibm_resource_instance.cos.crn
}

output "iks_cluster_id" {
  value = ibm_container_cluster.cryptobom.id
}

output "artifacts_bucket_name" {
  value = ibm_cos_bucket.artifacts.bucket_name
}
