import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildUrl,
  CliError,
  createAnalyzePayload,
  DEFAULT_BASE_URL,
  executeCommand,
  getBaseUrl,
  getTimeout,
  inferManager,
  parseArgv,
  printJson,
  printUsage,
  readText,
  requestJson,
  requireOption,
} from "../src/package_scanner";

type ResponseCallback = (response: http.IncomingMessage) => void;

async function createTempFile(contents: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "package-scanner-test-"));
  const filePath = path.join(directory, "fixture.txt");
  await writeFile(filePath, contents, "utf8");
  return filePath;
}

async function withHttpServer(
  handler: http.RequestListener,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to obtain test server address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("small helpers", () => {
  it("creates named CLI errors", () => {
    expect(new CliError("boom")).toMatchObject({
      message: "boom",
      name: "CliError",
    });
  });

  it("reads file contents from disk", async () => {
    const filePath = await createTempFile("hello");

    try {
      expect(readText(filePath)).toBe("hello");
    } finally {
      await rm(path.dirname(filePath), { recursive: true, force: true });
    }
  });

  it("infers supported package managers from lockfile names", () => {
    expect(inferManager("/tmp/package-lock.json")).toBe("npm");
    expect(inferManager("/tmp/pnpm-lock.yaml")).toBe("pnpm");
    expect(inferManager("/tmp/yarn.lock")).toBe("yarn");
    expect(inferManager("/tmp/bun.lock")).toBe("bun");
    expect(inferManager("/tmp/unknown.lock")).toBeNull();
  });

  it("parses timeout values and falls back to the default", () => {
    expect(getTimeout(undefined)).toBe(120);
    expect(getTimeout("30")).toBe(30);
  });

  it("rejects invalid timeout values", () => {
    expect(() => getTimeout(true)).toThrow("--timeout must be a positive number");
    expect(() => getTimeout("0")).toThrow("--timeout must be a positive number");
    expect(() => getTimeout("NaN")).toThrow("--timeout must be a positive number");
  });

  it("resolves the default and custom base URLs", () => {
    expect(getBaseUrl(undefined)).toBe(DEFAULT_BASE_URL);
    expect(getBaseUrl("https://example.com/api")).toBe("https://example.com/api");
  });

  it("requires named options", () => {
    expect(requireOption({ name: "left-pad" }, "name")).toBe("left-pad");
    expect(() => requireOption({}, "analysisId")).toThrow("Missing required option: --analysis-id");
  });

  it("writes usage text with the provided sink", () => {
    const write = vi.fn();

    printUsage(write);

    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]?.[0]).toContain("PackageScanner CLI helper");
    expect(write.mock.calls[0]?.[0]).toContain("analyze");
  });

  it("writes JSON to the provided sink", () => {
    const write = vi.fn();

    printJson({ ok: true }, write);

    expect(write).toHaveBeenCalledWith('{\n  "ok": true\n}\n');
  });

  it("uses process.stdout by default for usage and JSON output", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    printUsage();
    printJson({ ok: true });

    expect(stdoutSpy).toHaveBeenCalled();
  });
});

describe("parseArgv", () => {
  it("parses kebab-case options into camelCase keys", () => {
    expect(
      parseArgv([
        "analyze",
        "--lockfile",
        "pnpm-lock.yaml",
        "--package-json",
        "package.json",
        "--metadata-check",
      ]),
    ).toEqual({
      command: "analyze",
      options: {
        lockfile: "pnpm-lock.yaml",
        packageJson: "package.json",
        metadataCheck: true,
      },
    });
  });

  it("returns help for empty input and explicit help flags", () => {
    expect(parseArgv([])).toEqual({ help: true });
    expect(parseArgv(["-h"])).toEqual({ help: true });
    expect(parseArgv(["search", "--help"])).toEqual({ help: true });
  });

  it("throws on malformed arguments", () => {
    expect(() => parseArgv(["search", "leftover"])).toThrow("Unexpected argument: leftover");
    expect(() => parseArgv(["search", "--name"])).toThrow("Missing value for --name");
  });
});

describe("buildUrl", () => {
  it("normalizes base path and omits empty query params", () => {
    expect(
      buildUrl(`${DEFAULT_BASE_URL}/`, "/package/metadata", {
        name: "left-pad",
        version: "",
      }),
    ).toBe("https://www.package-scanner.dev/api/package/metadata?name=left-pad");
  });

  it("supports base URLs without a trailing slash", () => {
    expect(buildUrl("https://example.com/api", "health")).toBe("https://example.com/api/health");
  });
});

describe("createAnalyzePayload", () => {
  it("infers the package manager from the lockfile name", () => {
    const payload = createAnalyzePayload(
      {
        lockfile: "/tmp/pnpm-lock.yaml",
        packageJson: "/tmp/package.json",
        metadataCheck: true,
      },
      (filePath) => `${filePath}-content`,
    );

    expect(payload).toEqual({
      lockfileContent: "/tmp/pnpm-lock.yaml-content",
      manager: "pnpm",
      packageJsonContent: "/tmp/package.json-content",
      options: { enableMetadataCheck: true },
    });
  });

  it("allows package-json only payloads", () => {
    expect(
      createAnalyzePayload(
        {
          packageJson: "/tmp/package.json",
        },
        () => '{"name":"demo"}',
      ),
    ).toEqual({
      packageJsonContent: '{"name":"demo"}',
    });
  });

  it("accepts an explicit manager when inference is not possible", () => {
    expect(
      createAnalyzePayload(
        {
          lockfile: "/tmp/custom.lock",
          manager: "bun",
        },
        () => "lock-content",
      ),
    ).toEqual({
      lockfileContent: "lock-content",
      manager: "bun",
    });
  });

  it("rejects invalid analyze argument combinations", () => {
    expect(() => createAnalyzePayload({}, () => "unused")).toThrow(
      "Provide --lockfile and/or --package-json.",
    );
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/unknown.lock",
        },
        () => "unused",
      ),
    ).toThrow("Could not infer package manager. Pass --manager explicitly.");
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/package-lock.json",
          manager: "composer",
        },
        () => "unused",
      ),
    ).toThrow("--manager must be one of npm, pnpm, yarn, bun.");
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/package-lock.json",
          metadataCheck: true,
        },
        () => "unused",
      ),
    ).toThrow("--metadata-check requires --package-json.");
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/bun.lockb",
        },
        () => "unused",
      ),
    ).toThrow("bun.lockb is not supported. Use bun.lock text format instead.");
  });
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

describe("executeCommand", () => {
  it("prints usage for help without hitting the network", async () => {
    const writeStdout = vi.fn();
    const requestJsonMock = vi.fn();

    await executeCommand(["--help"], { requestJson: requestJsonMock, writeStdout });

    expect(requestJsonMock).not.toHaveBeenCalled();
    expect(writeStdout).toHaveBeenCalledOnce();
    expect(writeStdout.mock.calls[0]?.[0]).toContain("PackageScanner CLI helper");
  });

  it("calls the search endpoint and prints the response", async () => {
    const writeStdout = vi.fn();
    const requestJsonMock = vi.fn().mockResolvedValue({ ok: true });

    await executeCommand(["search", "--name", "left-pad", "--version", "1.3.0"], {
      requestJson: requestJsonMock,
      writeStdout,
    });

    expect(requestJsonMock).toHaveBeenCalledWith(
      "GET",
      "https://www.package-scanner.dev/api/malware-db/search?name=left-pad&version=1.3.0",
      { timeout: 120 },
    );
    expect(writeStdout).toHaveBeenCalledWith('{\n  "ok": true\n}\n');
  });

  it.each([
    [
      "health",
      ["health", "--base-url", "https://mirror.example/api", "--timeout", "5"],
      "GET",
      "https://mirror.example/api/health",
      { timeout: 5 },
    ],
    [
      "metadata",
      ["metadata", "--name", "left-pad"],
      "GET",
      "https://www.package-scanner.dev/api/package/metadata?name=left-pad",
      { timeout: 120 },
    ],
    [
      "vulnerabilities",
      ["vulnerabilities", "--name", "left-pad"],
      "GET",
      "https://www.package-scanner.dev/api/package/vulnerabilities?name=left-pad",
      { timeout: 120 },
    ],
    [
      "report",
      ["report", "--analysis-id", "abc123"],
      "GET",
      "https://www.package-scanner.dev/api/report/abc123",
      { timeout: 120 },
    ],
  ])("dispatches the %s command", async (_label, argv, method, url, options) => {
    const writeStdout = vi.fn();
    const requestJsonMock = vi.fn().mockResolvedValue({ ok: true });

    await executeCommand(argv, { requestJson: requestJsonMock, writeStdout });

    expect(requestJsonMock).toHaveBeenCalledWith(method, url, options);
    expect(writeStdout).toHaveBeenCalledWith('{\n  "ok": true\n}\n');
  });

  it("builds analyze payload from injected file contents", async () => {
    const writeStdout = vi.fn();
    const readTextMock = vi.fn((filePath: string) => `${filePath}-contents`);
    const requestJsonMock = vi.fn().mockResolvedValue({ analysisId: "abc123" });

    await executeCommand(
      ["analyze", "--lockfile", "package-lock.json", "--package-json", "package.json"],
      {
        readText: readTextMock,
        requestJson: requestJsonMock,
        writeStdout,
      },
    );

    expect(requestJsonMock).toHaveBeenCalledWith(
      "POST",
      "https://www.package-scanner.dev/api/ci/analyze",
      {
        payload: {
          lockfileContent: "package-lock.json-contents",
          manager: "npm",
          packageJsonContent: "package.json-contents",
        },
        timeout: 120,
      },
    );
    expect(writeStdout).toHaveBeenCalledWith('{\n  "analysisId": "abc123"\n}\n');
  });

  it("surfaces unknown commands and missing required options", async () => {
    await expect(executeCommand(["unknown-command"])).rejects.toThrow(
      "Unknown command: unknown-command",
    );
    await expect(executeCommand(["search"])).rejects.toThrow("Missing required option: --name");
  });
});
