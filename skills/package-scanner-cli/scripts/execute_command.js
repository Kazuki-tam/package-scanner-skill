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
async function fetchNamedPackageJson(pathname, { baseUrl, context, options, timeout }) {
    const url = (0, url_1.buildUrl)(baseUrl, pathname, {
        name: (0, options_1.requireOption)(options, "name"),
        version: getOptionalString(options.version),
    });
    await fetchAndPrintJson("GET", url, context, { timeout });
}
function createGetHandler(pathname) {
    return async ({ baseUrl, context, timeout }) => {
        const url = (0, url_1.buildUrl)(baseUrl, pathname);
        await fetchAndPrintJson("GET", url, context, { timeout });
    };
}
function createNamedPackageHandler(pathname) {
    return async (runtime) => {
        await fetchNamedPackageJson(pathname, runtime);
    };
}
function createReportHandler() {
    return async ({ baseUrl, context, options, timeout }) => {
        const url = (0, url_1.buildUrl)(baseUrl, `/report/${(0, options_1.requireOption)(options, "analysisId")}`);
        await fetchAndPrintJson("GET", url, context, { timeout });
    };
}
function createAnalyzeHandler() {
    return async ({ baseUrl, context, options, timeout }) => {
        const url = (0, url_1.buildUrl)(baseUrl, "/ci/analyze");
        const payload = (0, analyze_payload_1.createAnalyzePayload)(options, context.readText);
        await fetchAndPrintJson("POST", url, context, { payload, timeout });
    };
}
const COMMAND_HANDLERS = {
    health: createGetHandler("/health"),
    search: createNamedPackageHandler("/malware-db/search"),
    metadata: createNamedPackageHandler("/package/metadata"),
    vulnerabilities: createNamedPackageHandler("/package/vulnerabilities"),
    report: createReportHandler(),
    analyze: createAnalyzeHandler(),
};
async function executeCommand(argv, contextOverrides = {}) {
    const parsed = (0, argv_1.parseArgv)(argv);
    const context = createCommandContext(contextOverrides);
    if ("help" in parsed) {
        (0, print_1.printUsage)(context.writeStdout);
        return;
    }
    const timeout = (0, options_1.getTimeout)(parsed.options.timeout);
    const baseUrl = (0, options_1.getBaseUrl)(parsed.options.baseUrl);
    const handler = COMMAND_HANDLERS[parsed.command];
    if (!handler) {
        (0, cli_error_1.fail)(`Unknown command: ${parsed.command}`);
    }
    await handler({
        baseUrl,
        context,
        options: parsed.options,
        timeout,
    });
}
