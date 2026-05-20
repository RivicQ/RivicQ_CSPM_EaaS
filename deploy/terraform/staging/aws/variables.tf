variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "cryptobom"
}

variable "db_user" {
  type    = string
  default = "cbom_admin"
}

variable "db_password" {
  type = string
}
