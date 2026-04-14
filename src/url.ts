import { URL, URLSearchParams } from "node:url";

export function buildUrl(
  baseUrl: string,
  pathname: string,
  query?: Record<string, string | undefined>,
): string {
  const url = new URL(pathname.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
    url.search = params.toString();
  }

  return url.toString();
}
