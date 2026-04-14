"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgv = parseArgv;
const cli_error_1 = require("./cli_error");
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
            (0, cli_error_1.fail)(`Unexpected argument: ${token}`);
        }
        const key = token.slice(2);
        if (key === "metadata-check") {
            options.metadataCheck = true;
            continue;
        }
        const next = args[index + 1];
        if (!next || next.startsWith("--")) {
            (0, cli_error_1.fail)(`Missing value for --${key}`);
        }
        const normalizedKey = key.replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
        options[normalizedKey] = next;
        index += 1;
    }
    return { command, options };
}
