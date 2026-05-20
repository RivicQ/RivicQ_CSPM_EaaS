variable "gcp_project" {
  type = string
}

variable "gcp_region" {
  type = string
  default = "us-central1"
}

variable "instance_name" {
  type = string
  default = "cryptobom-staging"
}

variable "tier" {
  type = string
  default = "db-f1-micro"
}

variable "disk_size" {
  type = number
  default = 20
}

variable "db_name" {
  type = string
  default = "cryptobom"
}

variable "db_user" {
  type = string
  default = "cbom_admin"
}

variable "db_password" {
  type = string
}
