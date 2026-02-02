import { loadConfig } from "./config.js";
import { runCrawler } from "./crawler.js";

const config = loadConfig();

runCrawler(config).catch((error) => {
  console.error("crawler failed", error);
  process.exitCode = 1;
});
