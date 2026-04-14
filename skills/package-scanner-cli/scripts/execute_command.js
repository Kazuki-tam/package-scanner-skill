"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommand = executeCommand;
const analyze_payload_1 = require("./analyze_payload");
const cli_error_1 = require("./cli_error");
const options_1 = require("./options");
const argv_1 = require("./argv");
const print_1 = require("./print");
const read_text_1 = require("./read_text");
const request_json_1 = require("./request_json");
const url_1 = require("./url");
function createCommandContext(overrides = {}) {
    return {
        readText: read_text_1.readText,
        requestJson: request_json_1.requestJson,
        writeStdout: (text) => {
            process.stdout.write(text);
        },
        ...overrides,
    };
}
async function fetchAndPrintJson(method, url, context, options = {}) {
    (0, print_1.printJson)(await context.requestJson(method, url, options), context.writeStdout);
}
function getOptionalString(value) {
    return typeof value === "string" ? value : undefined;
}
async function executeCommand(argv, contextOverrides = {}) {
    const parsed = (0, argv_1.parseArgv)(argv);
    const context = createCommandContext(contextOverrides);
    if ("help" in parsed) {
        (0, print_1.printUsage)(context.writeStdout);
        return;
    }
    const timeout = (0, options_1.getTimeout)(parsed.options.timeout);
    const baseUrl = (0, options_1.getBaseUrl)(parsed.options.baseUrl);
    const commandHandlers = {
        health: async () => {
            const url = (0, url_1.buildUrl)(baseUrl, "/health");
            await fetchAndPrintJson("GET", url, context, { timeout });
        },
        search: async () => {
            const url = (0, url_1.buildUrl)(baseUrl, "/malware-db/search", {
                name: (0, options_1.requireOption)(parsed.options, "name"),
                version: getOptionalString(parsed.options.version),
            });
            await fetchAndPrintJson("GET", url, context, { timeout });
        },
        metadata: async () => {
            const url = (0, url_1.buildUrl)(baseUrl, "/package/metadata", {
                name: (0, options_1.requireOption)(parsed.options, "name"),
                version: getOptionalString(parsed.options.version),
            });
            await fetchAndPrintJson("GET", url, context, { timeout });
        },
        vulnerabilities: async () => {
            const url = (0, url_1.buildUrl)(baseUrl, "/package/vulnerabilities", {
                name: (0, options_1.requireOption)(parsed.options, "name"),
                version: getOptionalString(parsed.options.version),
            });
            await fetchAndPrintJson("GET", url, context, { timeout });
        },
        report: async () => {
            const url = (0, url_1.buildUrl)(baseUrl, `/report/${(0, options_1.requireOption)(parsed.options, "analysisId")}`);
            await fetchAndPrintJson("GET", url, context, { timeout });
        },
        analyze: async () => {
            const url = (0, url_1.buildUrl)(baseUrl, "/ci/analyze");
            const payload = (0, analyze_payload_1.createAnalyzePayload)(parsed.options, context.readText);
            await fetchAndPrintJson("POST", url, context, { payload, timeout });
        },
    };
    const handler = commandHandlers[parsed.command];
    if (!handler) {
        (0, cli_error_1.fail)(`Unknown command: ${parsed.command}`);
    }
    await handler();
}
