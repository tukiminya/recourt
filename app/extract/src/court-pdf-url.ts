export class InvalidCourtPdfUrlError extends Error {}

export function validateCourtPdfUrl(url: URL) {
  if (
    url.origin !== "https://www.courts.go.jp" ||
    !/^\/assets\/hanrei\/.+\.pdf$/i.test(url.pathname) ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new InvalidCourtPdfUrlError("The PDF URL is not allowed");
  }
}
