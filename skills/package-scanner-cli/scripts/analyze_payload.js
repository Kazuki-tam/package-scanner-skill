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
function inferManager(lockfilePath) {
    return constants_1.LOCKFILE_TO_MANAGER[node_path_1.default.basename(lockfilePath)] ?? null;
}
function createAnalyzePayload(options, readTextFn = read_text_1.readText) {
    const lockfile = typeof options.lockfile === "string" ? options.lockfile : undefined;
    const packageJson = typeof options.packageJson === "string" ? options.packageJson : undefined;
    const explicitManager = typeof options.manager === "string" ? options.manager : undefined;
    const manager = explicitManager ?? (lockfile ? inferManager(lockfile) : null);
    if (!lockfile && !packageJson) {
        (0, cli_error_1.fail)("Provide --lockfile and/or --package-json.");
    }
    if (lockfile && node_path_1.default.basename(lockfile) === "bun.lockb") {
        (0, cli_error_1.fail)("bun.lockb is not supported. Use bun.lock text format instead.");
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
