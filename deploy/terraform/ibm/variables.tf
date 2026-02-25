variable "environment" {
  description = "Deployment environment"
  default     = "production"
}

variable "ibm_api_key" {
  description = "IBM Cloud API key"
  sensitive   = true
}

variable "ibm_region" {
  description = "IBM Cloud region"
  default     = "eu-de"
}

variable "ibm_datacenter" {
  description = "IBM Cloud datacenter for IKS"
  default     = "fra02"
}

variable "ibm_resource_group_id" {
  description = "IBM Cloud resource group ID"
}
