resource "cloudflare_worker" "recourt_frontend" {
  account_id = var.cloudflare_account_id
  name = "recourt-frontend"
  observability = {
    enabled = true
    logs = {
      enable = true
      head_sampling_rate = 1
      invocation_logs = true
    }
  }
}

resource "cloudflare_worker" "recourt_crawler" {
  account_id = var.cloudflare_account_id
  name = "recourt-crawler"
  observability = {
    enabled = true
    logs = {
      enable = true
      head_sampling_rate = 1
      invocation_logs = true
    }
  }
}

resource "cloudflare_r2_bucket" "recourt_bucket" {
  account_id = var.cloudflare_account_id
  name = "recourt-bucket"
  location = "apac"
}

resource "cloudflare_d1_database" "recourt_database" {
  account_id = var.cloudflare_account_id
  name = "recourt-database"
  primary_location_hint = "apac"
}

resource "cloudflare_queue" "recourt_crawler_queue" {
  account_id = var.cloudflare_account_id
  queue_name = "recourt-crawler-queue"
}
