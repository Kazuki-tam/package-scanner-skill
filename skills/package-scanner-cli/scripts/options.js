"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeout = getTimeout;
exports.getBaseUrl = getBaseUrl;
exports.requireOption = requireOption;
const constants_1 = require("./constants");
const cli_error_1 = require("./cli_error");
function getTimeout(value) {
    if (value === undefined) {
        return 120;
    }
    if (typeof value !== "string") {
        (0, cli_error_1.fail)("--timeout must be a positive number");
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        (0, cli_error_1.fail)("--timeout must be a positive number");
    }
    return parsed;
}
function getBaseUrl(value) {
    return typeof value === "string" && value ? value : constants_1.DEFAULT_BASE_URL;
}
function requireOption(options, name) {
    const value = options[name];
    if (typeof value !== "string" || value.length === 0) {
        const cliName = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
        (0, cli_error_1.fail)(`Missing required option: --${cliName}`);
    }
    return value;
}
