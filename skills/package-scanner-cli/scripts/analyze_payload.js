"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferManager = inferManager;
exports.createAnalyzePayload = createAnalyzePayload;
const node_path_1 = __importDefault(require("node:path"));
const constants_1 = require("./constants");
const cli_error_1 = require("./cli_error");
const read_text_1 = require("./read_text");
const ALLOWED_ANALYZE_BASENAMES = {
    "--lockfile": constants_1.SUPPORTED_LOCKFILE_NAMES,
    "--package-json": new Set([constants_1.SUPPORTED_PACKAGE_JSON_BASENAME]),
};
function inferManager(lockfilePath) {
    return constants_1.LOCKFILE_TO_MANAGER[node_path_1.default.basename(lockfilePath)] ?? null;
}
function isForbiddenUploadBasename(fileName) {
    return (constants_1.FORBIDDEN_UPLOAD_BASENAMES.has(fileName) ||
        constants_1.FORBIDDEN_UPLOAD_PATTERNS.some((pattern) => pattern.test(fileName)));
}
function getAllowedAnalyzeBasenames(optionName) {
    return ALLOWED_ANALYZE_BASENAMES[optionName];
}
function getInvalidAnalyzeBasenameMessage(optionName) {
    if (optionName === "--package-json") {
        return `--package-json only accepts files named ${constants_1.SUPPORTED_PACKAGE_JSON_BASENAME}.`;
    }
    return "--lockfile only accepts package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock.";
}
function validateAnalyzeBasename(optionName, fileName) {
    if (isForbiddenUploadBasename(fileName)) {
        (0, cli_error_1.fail)(`Refusing to send sensitive file via ${optionName}: ${fileName}`);
    }
    if (fileName === "bun.lockb") {
        (0, cli_error_1.fail)("bun.lockb is not supported. Use bun.lock text format instead.");
    }
    if (!getAllowedAnalyzeBasenames(optionName).has(fileName)) {
        (0, cli_error_1.fail)(getInvalidAnalyzeBasenameMessage(optionName));
    }
}
function validateAnalyzeFilePath(optionName, filePath) {
    validateAnalyzeBasename(optionName, node_path_1.default.basename(filePath));
}
function createAnalyzePayload(options, readTextFn = read_text_1.readText) {
    const lockfile = typeof options.lockfile === "string" ? options.lockfile : undefined;
    const packageJson = typeof options.packageJson === "string" ? options.packageJson : undefined;
    const explicitManager = typeof options.manager === "string" ? options.manager : undefined;
    const manager = explicitManager ?? (lockfile ? inferManager(lockfile) : null);
    if (!lockfile && !packageJson) {
        (0, cli_error_1.fail)("Provide --lockfile and/or --package-json.");
    }
    if (lockfile) {
        validateAnalyzeFilePath("--lockfile", lockfile);
    }
    if (packageJson) {
        validateAnalyzeFilePath("--package-json", packageJson);
    }
    if (lockfile && !manager) {
        (0, cli_error_1.fail)("Could not infer package manager. Pass --manager explicitly.");
    }
    if (manager && !constants_1.PACKAGE_MANAGERS.has(manager)) {
        (0, cli_error_1.fail)("--manager must be one of npm, pnpm, yarn, bun.");
    }
    if (options.metadataCheck && !packageJson) {
        (0, cli_error_1.fail)("--metadata-check requires --package-json.");
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
