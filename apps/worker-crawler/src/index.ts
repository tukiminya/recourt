import { env } from "cloudflare:workers";
import { recentSaikosaiHanreiSearchUrl } from "./crawler/court";
import { extractRawDetailMetadata as extractRawDetailMetadataPipeline } from "./pipeline/details-meta";
import { addCrawlQueueJobs, extractSearchList } from "./pipeline/search";
import type { CrawlerQueuePayload } from "./types";

export default {
  async scheduled() {
    await env.CRAWLER_QUEUE.send({
      type: "list",
      url: new URL(recentSaikosaiHanreiSearchUrl),
    } satisfies CrawlerQueuePayload);
  },

  async queue(batch) {
    switch (batch.queue) {
      case "recourt-crawler-queue": {
        const messages = batch.messages as Message<CrawlerQueuePayload>[];
        for (const msg of messages) {
          switch (msg.body.type) {
            case "list": {
              console.profile("Process list job");
              console.log("list!");
              const extractResult = await extractSearchList(msg.body);

              if (extractResult.nextPageUrl) {
                await addCrawlQueueJobs({
                  type: "list",
                  url: extractResult.nextPageUrl,
                });
              }

              await addCrawlQueueJobs(
                extractResult.detailPageUrls.map((url) => {
                  return {
                    type: "details",
                    url: url,
                  };
                }),
              );

              console.profileEnd();
              break;
            }
            case "details": {
              console.profile("Process details job");
              const result = await extractRawDetailMetadataPipeline(msg.body);
              console.log(result);
              console.profileEnd();
              break;
            }
            default: {
              console.warn("Unknown task type");
              break;
            }
          }
          console.log("end ---------");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        break;
      }
      default: {
        break;
      }
    }
  },
} satisfies ExportedHandler<Env>;
