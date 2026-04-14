#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { URL, URLSearchParams } from "node:url";

export const DEFAULT_BASE_URL = "https://www.package-scanner.dev/api";

const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
const LOCKFILE_TO_MANAGER: Record<string, string> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
};

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type CommandOptions = Record<string, string | boolean>;
export type ParsedArgv =
  | { help: true }
  | {
      command: string;
      options: CommandOptions;
    };

export type ReadTextFn = (filePath: string) => string;
export type RequestJsonFn = (
  method: string,
  urlString: string,
  options?: { payload?: JsonObject; timeout?: number },
) => Promise<JsonValue>;
export type WriteFn = (text: string) => void;

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

type CommandContext = {
  readText: ReadTextFn;
  requestJson: RequestJsonFn;
  writeStdout: WriteFn;
};

function fail(message: string): never {
  throw new CliError(message);
}

function exitWithError(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const defaultWriteStdout: WriteFn = (text) => {
  process.stdout.write(text);
};

export function printUsage(write: WriteFn = defaultWriteStdout): void {
  const usage = `PackageScanner CLI helper

Usage:
  node scripts/package_scanner.js <command> [options]

Commands:
  health
  search --name <package> [--version <version>]
  metadata --name <package> [--version <version>]
  vulnerabilities --name <package> [--version <version>]
  report --analysis-id <id>
  analyze [--lockfile <path>] [--package-json <path>] [--manager <npm|pnpm|yarn|bun>] [--metadata-check]

Common options:
  --base-url <url>   PackageScanner API base URL
  --timeout <secs>   Request timeout in seconds (default: 120)
  --help             Show this message
`;

  write(`${usage}\n`);
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function inferManager(lockfilePath: string): string | null {
  return LOCKFILE_TO_MANAGER[path.basename(lockfilePath)] ?? null;
}

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

export function printJson(payload: JsonValue, write: WriteFn = defaultWriteStdout): void {
  write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function parseArgv(argv: string[]): ParsedArgv {
  const args = [...argv];

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  const command = args.shift();
  if (!command) {
    return { help: true };
  }

  const options: CommandOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      fail(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);

    if (key === "metadata-check") {
      options.metadataCheck = true;
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      fail(`Missing value for --${key}`);
    }

    const normalizedKey = key.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
    options[normalizedKey] = next;
    index += 1;
  }

  return { command, options };
}

export function getTimeout(value: string | boolean | undefined): number {
  if (value === undefined) {
    return 120;
  }

  if (typeof value !== "string") {
    fail("--timeout must be a positive number");
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail("--timeout must be a positive number");
  }

  return parsed;
}

export function getBaseUrl(value: string | boolean | undefined): string {
  return typeof value === "string" && value ? value : DEFAULT_BASE_URL;
}

export function requireOption(options: CommandOptions, name: string): string {
  const value = options[name];

  if (typeof value !== "string" || value.length === 0) {
    const cliName = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    fail(`Missing required option: --${cliName}`);
  }

  return value;
}

export function createAnalyzePayload(
  options: CommandOptions,
  readTextFn: ReadTextFn = readText,
): JsonObject {
  const lockfile = typeof options.lockfile === "string" ? options.lockfile : undefined;
  const packageJson = typeof options.packageJson === "string" ? options.packageJson : undefined;
  const explicitManager = typeof options.manager === "string" ? options.manager : undefined;
  const manager = explicitManager ?? (lockfile ? inferManager(lockfile) : null);

  if (!lockfile && !packageJson) {
    fail("Provide --lockfile and/or --package-json.");
  }

  if (lockfile && path.basename(lockfile) === "bun.lockb") {
    fail("bun.lockb is not supported. Use bun.lock text format instead.");
  }

  if (lockfile && !manager) {
    fail("Could not infer package manager. Pass --manager explicitly.");
  }

  if (manager && !PACKAGE_MANAGERS.has(manager)) {
    fail("--manager must be one of npm, pnpm, yarn, bun.");
  }

  if (options.metadataCheck && !packageJson) {
    fail("--metadata-check requires --package-json.");
  }

  const payload: JsonObject = {};

  if (lockfile) {
    payload.lockfileContent = readTextFn(lockfile);
    payload.manager = manager as string;
  }

  if (packageJson) {
    payload.packageJsonContent = readTextFn(packageJson);
  }

  if (options.metadataCheck) {
    payload.options = { enableMetadataCheck: true };
  }

  return payload;
}

function createCommandContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    readText,
    requestJson,
    writeStdout: defaultWriteStdout,
    ...overrides,
  };
}

async function fetchAndPrintJson(
  method: string,
  url: string,
  context: CommandContext,
  options: { payload?: JsonObject; timeout?: number } = {},
): Promise<void> {
  printJson(await context.requestJson(method, url, options), context.writeStdout);
}

function getOptionalString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function executeCommand(
  argv: string[],
  contextOverrides: Partial<CommandContext> = {},
): Promise<void> {
  const parsed = parseArgv(argv);
  const context = createCommandContext(contextOverrides);

  if ("help" in parsed) {
    printUsage(context.writeStdout);
    return;
  }

  const timeout = getTimeout(parsed.options.timeout);
  const baseUrl = getBaseUrl(parsed.options.baseUrl);

  const commandHandlers: Record<string, () => Promise<void>> = {
    health: async () => {
      const url = buildUrl(baseUrl, "/health");
      await fetchAndPrintJson("GET", url, context, { timeout });
    },
    search: async () => {
      const url = buildUrl(baseUrl, "/malware-db/search", {
        name: requireOption(parsed.options, "name"),
        version: getOptionalString(parsed.options.version),
      });
      await fetchAndPrintJson("GET", url, context, { timeout });
    },
    metadata: async () => {
      const url = buildUrl(baseUrl, "/package/metadata", {
        name: requireOption(parsed.options, "name"),
        version: getOptionalString(parsed.options.version),
      });
      await fetchAndPrintJson("GET", url, context, { timeout });
    },
    vulnerabilities: async () => {
      const url = buildUrl(baseUrl, "/package/vulnerabilities", {
        name: requireOption(parsed.options, "name"),
        version: getOptionalString(parsed.options.version),
      });
      await fetchAndPrintJson("GET", url, context, { timeout });
    },
    report: async () => {
      const url = buildUrl(baseUrl, `/report/${requireOption(parsed.options, "analysisId")}`);
      await fetchAndPrintJson("GET", url, context, { timeout });
    },
    analyze: async () => {
      const url = buildUrl(baseUrl, "/ci/analyze");
      const payload = createAnalyzePayload(parsed.options, context.readText);
      await fetchAndPrintJson("POST", url, context, { payload, timeout });
    },
  };

  const handler = commandHandlers[parsed.command];
  if (!handler) {
    fail(`Unknown command: ${parsed.command}`);
  }

  await handler();
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  await executeCommand(argv);
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    exitWithError(message);
  });
}
