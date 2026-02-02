variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "gcp"
}

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "java_container_port" {
  type    = number
  default = 8080
}

variable "python_container_port" {
  type    = number
  default = 8080
}

variable "java_image_tag" {
  type    = string
  default = "latest"
}

variable "python_image_tag" {
  type    = string
  default = "latest"
}
