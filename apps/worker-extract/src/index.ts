import type { ExtractQueuePayload } from "./types";

export default {
  async queue(batch) {
    switch (batch.queue) {
      case "recourt-extract-queue": {
        const messages = batch.messages as Message<ExtractQueuePayload>[];
        for (const message of messages) {
          if (message.body.type !== "extract") {
            console.warn("Unknown extract task type", message.body);
            continue;
          }

          const payload = message.body;
          console.log("[worker-extract] received", {
            detail_url: payload.detail_url,
            crawled_at: payload.crawled_at,
            jiken_code: payload.metadata.jiken_code,
            jiken_name: payload.metadata.jiken_name,
            saiban_date: payload.metadata.saiban_date,
            pdf: payload.metadata.pdf,
          });
        }
        break;
      }
      default: {
        console.warn("Unknown queue", batch.queue);
        break;
      }
    }
  },
} satisfies ExportedHandler;
