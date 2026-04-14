#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliError = exports.DEFAULT_BASE_URL = void 0;
exports.printUsage = printUsage;
exports.readText = readText;
exports.inferManager = inferManager;
exports.buildUrl = buildUrl;
exports.requestJson = requestJson;
exports.printJson = printJson;
exports.parseArgv = parseArgv;
exports.getTimeout = getTimeout;
exports.getBaseUrl = getBaseUrl;
exports.requireOption = requireOption;
exports.createAnalyzePayload = createAnalyzePayload;
exports.executeCommand = executeCommand;
exports.main = main;
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
exports.DEFAULT_BASE_URL = "https://www.package-scanner.dev/api";
const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
const LOCKFILE_TO_MANAGER = {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "bun.lock": "bun",
};
class CliError extends Error {
    constructor(message) {
        super(message);
        this.name = "CliError";
    }
}
exports.CliError = CliError;
function fail(message) {
    throw new CliError(message);
}
function exitWithError(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}
const defaultWriteStdout = (text) => {
    process.stdout.write(text);
};
function printUsage(write = defaultWriteStdout) {
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
function readText(filePath) {
    return node_fs_1.default.readFileSync(filePath, "utf8");
}
function inferManager(lockfilePath) {
    return LOCKFILE_TO_MANAGER[node_path_1.default.basename(lockfilePath)] ?? null;
}
function buildUrl(baseUrl, pathname, query) {
    const url = new node_url_1.URL(pathname.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (query) {
        const params = new node_url_1.URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== "") {
                params.set(key, value);
            }
        }
        url.search = params.toString();
    }
    return url.toString();
}
function requestJson(method, urlString, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new node_url_1.URL(urlString);
        const transport = url.protocol === "https:" ? node_https_1.default : node_http_1.default;
        const body = options.payload === undefined ? null : JSON.stringify(options.payload);
        const headers = { Accept: "application/json" };
        if (body !== null) {
            headers["Content-Type"] = "application/json";
            headers["Content-Length"] = Buffer.byteLength(body);
        }
        const req = transport.request(url, {
            method,
            headers,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
                chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            });
            res.on("end", () => {
                const rawBody = Buffer.concat(chunks).toString("utf8");
                const statusCode = res.statusCode ?? 0;
                if (statusCode < 200 || statusCode >= 300) {
                    reject(new Error(`HTTP ${statusCode}: ${rawBody || res.statusMessage || "Request failed"}`));
                    return;
                }
                if (!rawBody) {
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(rawBody));
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    reject(new Error(`Response was not valid JSON: ${message}`));
                }
            });
        });
        req.on("error", (error) => {
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
function printJson(payload, write = defaultWriteStdout) {
    write(`${JSON.stringify(payload, null, 2)}\n`);
}
function parseArgv(argv) {
    const args = [...argv];
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        return { help: true };
    }
    const command = args.shift();
    if (!command) {
        return { help: true };
    }
    const options = {};
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
        const normalizedKey = key.replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
        options[normalizedKey] = next;
        index += 1;
    }
    return { command, options };
}
function getTimeout(value) {
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
function getBaseUrl(value) {
    return typeof value === "string" && value ? value : exports.DEFAULT_BASE_URL;
}
function requireOption(options, name) {
    const value = options[name];
    if (typeof value !== "string" || value.length === 0) {
        const cliName = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
        fail(`Missing required option: --${cliName}`);
    }
    return value;
}
function createAnalyzePayload(options, readTextFn = readText) {
    const lockfile = typeof options.lockfile === "string" ? options.lockfile : undefined;
    const packageJson = typeof options.packageJson === "string" ? options.packageJson : undefined;
    const explicitManager = typeof options.manager === "string" ? options.manager : undefined;
    const manager = explicitManager ?? (lockfile ? inferManager(lockfile) : null);
    if (!lockfile && !packageJson) {
        fail("Provide --lockfile and/or --package-json.");
    }
    if (lockfile && node_path_1.default.basename(lockfile) === "bun.lockb") {
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
    const payload = {};
    if (lockfile) {
        payload.lockfileContent = readTextFn(lockfile);
        payload.manager = manager;
    }
    if (packageJson) {
        payload.packageJsonContent = readTextFn(packageJson);
    }
    if (options.metadataCheck) {
        payload.options = { enableMetadataCheck: true };
    }
    return payload;
}
function createCommandContext(overrides = {}) {
    return {
        readText,
        requestJson,
        writeStdout: defaultWriteStdout,
        ...overrides,
    };
}
async function fetchAndPrintJson(method, url, context, options = {}) {
    printJson(await context.requestJson(method, url, options), context.writeStdout);
}
function getOptionalString(value) {
    return typeof value === "string" ? value : undefined;
}
async function executeCommand(argv, contextOverrides = {}) {
    const parsed = parseArgv(argv);
    const context = createCommandContext(contextOverrides);
    if ("help" in parsed) {
        printUsage(context.writeStdout);
        return;
    }
    const timeout = getTimeout(parsed.options.timeout);
    const baseUrl = getBaseUrl(parsed.options.baseUrl);
    const commandHandlers = {
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
async function main(argv = process.argv.slice(2)) {
    await executeCommand(argv);
}
if (require.main === module) {
    void main().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        exitWithError(message);
    });
}
