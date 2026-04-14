import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

import type { JsonObject, JsonValue } from "./types";

export function requestJson(
  method: string,
  urlString: string,
  options: { payload?: JsonObject; timeout?: number } = {},
): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? https : http;
    const body = options.payload === undefined ? null : JSON.stringify(options.payload);
    const headers: Record<string, string | number> = { Accept: "application/json" };

    if (body !== null) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = transport.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer | string) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });

        res.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          const statusCode = res.statusCode ?? 0;

          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(`HTTP ${statusCode}: ${rawBody || res.statusMessage || "Request failed"}`),
            );
            return;
          }

          if (!rawBody) {
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(rawBody) as JsonValue);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            reject(new Error(`Response was not valid JSON: ${message}`));
          }
        });
      },
    );

    req.on("error", (error: Error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.setTimeout((options.timeout ?? 120) * 1000, () => {
      req.destroy(new Error("Request timed out"));
    });

    if (body !== null) {
      req.write(body);
    }

    req.end();
  });
}
