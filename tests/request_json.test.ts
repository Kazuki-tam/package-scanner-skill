import http from "node:http";
import https from "node:https";

import { afterEach, describe, expect, it, vi } from "vitest";

import { requestJson } from "../src/package_scanner";
import { withHttpServer } from "./helpers";

type ResponseCallback = (response: http.IncomingMessage) => void;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestJson", () => {
  it("parses JSON responses over HTTP", async () => {
    await withHttpServer(
      (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      },
      async (baseUrl) => {
        await expect(requestJson("GET", `${baseUrl}/health`)).resolves.toEqual({ ok: true });
      },
    );
  });

  it("returns null for empty successful responses", async () => {
    await withHttpServer(
      (_req, res) => {
        res.statusCode = 204;
        res.end();
      },
      async (baseUrl) => {
        await expect(requestJson("GET", `${baseUrl}/health`)).resolves.toBeNull();
      },
    );
  });

  it("rejects non-2xx responses with the response body", async () => {
    await withHttpServer(
      (_req, res) => {
        res.statusCode = 500;
        res.end("server exploded");
      },
      async (baseUrl) => {
        await expect(requestJson("GET", `${baseUrl}/health`)).rejects.toThrow(
          "HTTP 500: server exploded",
        );
      },
    );
  });

  it("rejects invalid JSON responses", async () => {
    await withHttpServer(
      (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end("{invalid");
      },
      async (baseUrl) => {
        await expect(requestJson("GET", `${baseUrl}/health`)).rejects.toThrow(
          "Response was not valid JSON:",
        );
      },
    );
  });

  it("uses the https transport and sends JSON payloads", async () => {
    const writtenChunks: string[] = [];
    const destroy = vi.fn();
    const requestSpy = vi.spyOn(https, "request").mockImplementation(((
      url: string | URL,
      optionsOrCallback?: http.RequestOptions | ResponseCallback,
      maybeCallback?: ResponseCallback,
    ) => {
      const options =
        typeof optionsOrCallback === "function" || optionsOrCallback === undefined
          ? {}
          : optionsOrCallback;
      const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;

      if (!callback) {
        throw new Error("Expected callback");
      }

      const response = new http.IncomingMessage(null as never);
      response.statusCode = 200;
      response.statusMessage = "OK";

      const request = {
        on: vi.fn(),
        write: vi.fn((chunk: string) => {
          writtenChunks.push(chunk);
        }),
        end: vi.fn(() => {
          callback(response);
          response.emit("data", JSON.stringify({ secure: true }));
          response.emit("end");
        }),
        setTimeout: vi.fn(),
        destroy,
      };

      expect(url.toString()).toBe("https://example.com/secure");
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        Accept: "application/json",
        "Content-Type": "application/json",
      });

      return request as never;
    }) as unknown as typeof https.request);

    await expect(
      requestJson("POST", "https://example.com/secure", {
        payload: { name: "demo" },
        timeout: 9,
      }),
    ).resolves.toEqual({ secure: true });

    expect(requestSpy).toHaveBeenCalledOnce();
    expect(writtenChunks).toEqual(['{"name":"demo"}']);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("rejects request errors from the transport", async () => {
    vi.spyOn(http, "request").mockImplementation(((
      _url: string | URL,
      _optionsOrCallback?: http.RequestOptions | ResponseCallback,
      _maybeCallback?: ResponseCallback,
    ) => {
      const handlers: Record<string, ((error: Error) => void) | undefined> = {};
      return {
        on: vi.fn((event: string, handler: (error: Error) => void) => {
          handlers[event] = handler;
        }),
        write: vi.fn(),
        end: vi.fn(() => {
          handlers.error?.(new Error("socket hang up"));
        }),
        setTimeout: vi.fn(),
        destroy: vi.fn(),
      } as never;
    }) as unknown as typeof http.request);

    await expect(requestJson("GET", "http://example.test/fail")).rejects.toThrow(
      "Request failed: socket hang up",
    );
  });

  it("rejects when the request times out", async () => {
    const handlers: Record<string, ((error: Error) => void) | undefined> = {};

    vi.spyOn(http, "request").mockImplementation(((
      _url: string | URL,
      _optionsOrCallback?: http.RequestOptions | ResponseCallback,
      _maybeCallback?: ResponseCallback,
    ) => ({
      on: vi.fn((event: string, handler: (error: Error) => void) => {
        handlers[event] = handler;
      }),
      write: vi.fn(),
      end: vi.fn(),
      setTimeout: vi.fn((_timeout: number, handler: () => void) => {
        handler();
      }),
      destroy: vi.fn((error?: Error) => {
        if (error) {
          handlers.error?.(error);
        }
      }),
    })) as unknown as typeof http.request);

    await expect(requestJson("GET", "http://example.test/slow", { timeout: 0.01 })).rejects.toThrow(
      "Request timed out",
    );
  });
});
