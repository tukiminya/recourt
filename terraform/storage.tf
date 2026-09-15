resource "cloudflare_r2_bucket" "recourt" {
  name       = "recourt-v1"
  account_id = var.cloudflare_account_id
  location   = "apac"
}

resource "cloudflare_r2_bucket" "recourt_drafts" {
  name       = "recourt-drafts-v1"
  account_id = var.cloudflare_account_id
  location   = "apac"
}

resource "cloudflare_r2_bucket_lock" "recourt_published_articles" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.recourt.name

  rules = [{
    id      = "retain-published-articles"
    enabled = true
    prefix  = "article/"
    condition = {
      type = "Indefinite"
    }
  }]
}

resource "cloudflare_r2_custom_domain" "recourt-custom-domain" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.recourt.name
  enabled     = true
  domain      = "cdn.${var.cloudflare_recourt_domain}"
  zone_id     = var.cloudflare_recourt_zone_id
}
