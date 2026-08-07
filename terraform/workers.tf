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

resource "cloudflare_workers_custom_domain" "recourt-api-custom-domain" {
  account_id = var.cloudflare_account_id
  service = cloudflare_worker.recourt-api.name
  hostname = "api.${var.cloudflare_recourt_domain}"
}

resource "cloudflare_worker" "recourt-frontend" {
  name = "recourt-frontend"
  account_id = var.cloudflare_account_id
}

resource "cloudflare_workers_custom_domain" "recourt-frontend-custom-domain" {
  account_id = var.cloudflare_account_id
  service = cloudflare_worker.recourt-frontend.name
  hostname = var.cloudflare_recourt_domain
}
