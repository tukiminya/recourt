resource "cloudflare_worker" "recourt-api" {
  name = "recourt-api"
  account_id = var.cloudflare_account_id
  observability = {
    enabled = true
    traces = {
      enabled = true
    }
  }
}

resource "cloudflare_worker" "recourt-frontend" {
  name = "recourt-frontend"
  account_id = var.cloudflare_account_id
}

resource "cloudflare_worker" "recourt-extractor" {
  name = "recourt-extractor"
  account_id = var.cloudflare_account_id
}
