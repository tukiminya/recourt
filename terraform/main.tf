terraform {
  required_version = ">= 1.12.2"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.1"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
