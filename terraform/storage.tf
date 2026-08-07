resource "cloudflare_r2_bucket" "recourt" {
  name = "recourt"
  account_id = var.cloudflare_account_id
  location = "apac"
}

resource "cloudflare_r2_custom_domain" "recourt-custom-domain" {
  account_id = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.recourt.name
  enabled = true
  domain = "cdn.${var.cloudflare_recourt_domain}"
  zone_id = var.cloudflare_recourt_zone_id
}
