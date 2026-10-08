import { isIP } from "node:net";

export class InvalidSourceUrlError extends Error {}

export function parseSourceUrl(input: string): URL {
  if (input.length > 2_048) throw new InvalidSourceUrlError("URLが長すぎます。別のURLをお試しください。");

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new InvalidSourceUrlError("有効な記事URLを入力してください。");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new InvalidSourceUrlError("公開されたHTTPSの記事URLを入力してください。");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    isIP(hostname.replace(/^\[|\]$/g, "")) !== 0 ||
    !hostname.includes(".") ||
    hostname.endsWith(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid")
  ) {
    throw new InvalidSourceUrlError("公開サイトの記事URLを入力してください。");
  }

  url.hash = "";
  return url;
}
