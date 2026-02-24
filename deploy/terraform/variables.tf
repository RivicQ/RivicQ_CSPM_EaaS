# Shared variables across all cloud providers

variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "cryptobom"
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = ""
}

variable "gcp_region" {
  description = "GCP region for deployment"
  type        = string
  default     = "europe-west3"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-central-1"
}

variable "ibm_region" {
  description = "IBM Cloud region for deployment"
  type        = string
  default     = "eu-de"
}

variable "ibm_api_key" {
  description = "IBM Cloud API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_access_key" {
  description = "AWS access key ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_secret_key" {
  description = "AWS secret access key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
  default     = ""
}
