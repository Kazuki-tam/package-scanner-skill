#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommand = exports.requireOption = exports.getBaseUrl = exports.getTimeout = exports.parseArgv = exports.requestJson = exports.buildUrl = exports.createAnalyzePayload = exports.inferManager = exports.readText = exports.printJson = exports.printUsage = exports.DEFAULT_BASE_URL = exports.CliError = void 0;
exports.main = main;
var cli_error_1 = require("./cli_error");
Object.defineProperty(exports, "CliError", { enumerable: true, get: function () { return cli_error_1.CliError; } });
var constants_1 = require("./constants");
Object.defineProperty(exports, "DEFAULT_BASE_URL", { enumerable: true, get: function () { return constants_1.DEFAULT_BASE_URL; } });
var print_1 = require("./print");
Object.defineProperty(exports, "printUsage", { enumerable: true, get: function () { return print_1.printUsage; } });
Object.defineProperty(exports, "printJson", { enumerable: true, get: function () { return print_1.printJson; } });
var read_text_1 = require("./read_text");
Object.defineProperty(exports, "readText", { enumerable: true, get: function () { return read_text_1.readText; } });
var analyze_payload_1 = require("./analyze_payload");
Object.defineProperty(exports, "inferManager", { enumerable: true, get: function () { return analyze_payload_1.inferManager; } });
Object.defineProperty(exports, "createAnalyzePayload", { enumerable: true, get: function () { return analyze_payload_1.createAnalyzePayload; } });
var url_1 = require("./url");
Object.defineProperty(exports, "buildUrl", { enumerable: true, get: function () { return url_1.buildUrl; } });
var request_json_1 = require("./request_json");
Object.defineProperty(exports, "requestJson", { enumerable: true, get: function () { return request_json_1.requestJson; } });
var argv_1 = require("./argv");
Object.defineProperty(exports, "parseArgv", { enumerable: true, get: function () { return argv_1.parseArgv; } });
var options_1 = require("./options");
Object.defineProperty(exports, "getTimeout", { enumerable: true, get: function () { return options_1.getTimeout; } });
Object.defineProperty(exports, "getBaseUrl", { enumerable: true, get: function () { return options_1.getBaseUrl; } });
Object.defineProperty(exports, "requireOption", { enumerable: true, get: function () { return options_1.requireOption; } });
var execute_command_1 = require("./execute_command");
Object.defineProperty(exports, "executeCommand", { enumerable: true, get: function () { return execute_command_1.executeCommand; } });
const execute_command_2 = require("./execute_command");
async function main(argv = process.argv.slice(2)) {
    await (0, execute_command_2.executeCommand)(argv);
}
if (require.main === module) {
    void main().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${message}\n`);
        process.exit(1);
    });
}
