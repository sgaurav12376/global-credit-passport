terraform {
  backend "s3" {
    bucket         = "synergy-terraform-state-gcp-use1"
    key            = "gcp/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "synergy-terraform-locks"
    encrypt        = true
  }
}
