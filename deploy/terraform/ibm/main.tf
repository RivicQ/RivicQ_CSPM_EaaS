terraform {
  required_providers {
    ibm = {
      source  = "IBM-Cloud/ibm"
      version = "~> 1.60"
    }
  }
  required_version = ">= 1.5.0"
}

provider "ibm" {
  region = var.ibm_region
}

# Variables
variable "ibm_region" {
  description = "IBM Cloud region"
  default     = "eu-de"
}

variable "environment" {
  description = "Environment name"
  default     = "production"
}

variable "resource_group" {
  description = "IBM Cloud resource group"
  default     = "cryptobom"
}

# IBM Hyper Protect Crypto Services (HPCS)
resource "ibm_resource_instance" "hpcs" {
  name              = "cryptobom-hpcs-${var.environment}"
  service           = "hs-crypto"
  plan              = "standard"
  location          = var.ibm_region
  resource_group_id = data.ibm_resource_group.cryptobom.id

  timeouts {
    create = "30m"
    delete = "30m"
  }

  tags = [
    "environment:${var.environment}",
    "project:cryptobom",
    "managed-by:terraform",
    "compliance:fips-140-3"
  ]
}

# IBM Cloud Object Storage
resource "ibm_resource_instance" "cos" {
  name              = "cryptobom-cos-${var.environment}"
  service           = "cloud-object-storage"
  plan              = "standard"
  location          = "global"
  resource_group_id = data.ibm_resource_group.cryptobom.id

  tags = [
    "environment:${var.environment}",
    "project:cryptobom",
    "managed-by:terraform"
  ]
}

resource "ibm_cos_bucket" "cryptobom_artifacts" {
  bucket_name          = "cryptobom-artifacts-${var.environment}"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = var.ibm_region
  storage_class        = "smart"

  kms_key_crn = ibm_resource_instance.hpcs.id
}

# IBM Key Protect (backup KMS)
resource "ibm_resource_instance" "key_protect" {
  name              = "cryptobom-kp-${var.environment}"
  service           = "kms"
  plan              = "tiered-pricing"
  location          = var.ibm_region
  resource_group_id = data.ibm_resource_group.cryptobom.id

  tags = [
    "environment:${var.environment}",
    "project:cryptobom",
    "managed-by:terraform"
  ]
}

data "ibm_resource_group" "cryptobom" {
  name = var.resource_group
}

# Outputs
output "hpcs_instance_id" {
  description = "HPCS instance ID"
  value       = ibm_resource_instance.hpcs.id
}

output "cos_instance_id" {
  description = "COS instance ID"
  value       = ibm_resource_instance.cos.id
}

output "key_protect_instance_id" {
  description = "Key Protect instance ID"
  value       = ibm_resource_instance.key_protect.id
}
