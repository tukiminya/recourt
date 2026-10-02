import { isIP } from "node:net";
import { promises as dns } from "node:dns";

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

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second, third] = octets;
  return !(
    first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 203 && second === 0 && third === 113) ||
    (first === 198 && second === 51 && third === 100)
  );
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  // Public IPv6 unicast addresses are in 2000::/3. Exclude documentation addresses.
  return /^[23][0-9a-f]*:/.test(normalized) && !normalized.startsWith("2001:db8:");
}

export async function assertPublicDns(hostname: string): Promise<void> {
  const [ipv4, ipv6] = await Promise.all([
    dns.resolve4(hostname).catch(() => [] as string[]),
    dns.resolve6(hostname).catch(() => [] as string[]),
  ]);
  if (
    ipv4.length + ipv6.length === 0 ||
    ipv4.some((address) => !isPublicIpv4(address)) ||
    ipv6.some((address) => !isPublicIpv6(address))
  ) {
    throw new InvalidSourceUrlError("公開サイトのアドレスを確認できませんでした。");
  }
}

export async function allowedSourceHosts(hostname: string): Promise<string[]> {
  await assertPublicDns(hostname);
  const alternate = hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`;
  try {
    await assertPublicDns(alternate);
    return [hostname, alternate];
  } catch {
    return [hostname];
  }
}
