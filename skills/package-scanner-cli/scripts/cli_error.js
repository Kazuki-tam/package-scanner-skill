"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliError = void 0;
exports.fail = fail;
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
