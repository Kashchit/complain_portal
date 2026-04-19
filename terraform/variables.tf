variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "Amazon Linux 2 AMI ID"
  type        = string
  default     = "ami-0c2b8ca1dad447f8a"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "Existing EC2 key pair name"
  type        = string
}

variable "vpc_id" {
  description = "VPC where portal resources are created"
  type        = string
}

variable "subnet_ids" {
  description = "At least two subnet IDs in different availability zones"
  type        = list(string)
}

variable "project_name" {
  description = "Tagging and naming prefix for resources"
  type        = string
  default     = "complaint-portal"
}
