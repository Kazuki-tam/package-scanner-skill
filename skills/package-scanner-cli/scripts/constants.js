"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORBIDDEN_UPLOAD_PATTERNS = exports.FORBIDDEN_UPLOAD_BASENAMES = exports.SUPPORTED_LOCKFILE_NAMES = exports.SUPPORTED_PACKAGE_JSON_BASENAME = exports.LOCKFILE_TO_MANAGER = exports.PACKAGE_MANAGERS = exports.DEFAULT_BASE_URL = void 0;
exports.DEFAULT_BASE_URL = "https://www.package-scanner.dev/api";
exports.PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
exports.LOCKFILE_TO_MANAGER = {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "bun.lock": "bun",
};
exports.SUPPORTED_PACKAGE_JSON_BASENAME = "package.json";
exports.SUPPORTED_LOCKFILE_NAMES = new Set(Object.keys(exports.LOCKFILE_TO_MANAGER));
exports.FORBIDDEN_UPLOAD_BASENAMES = new Set([
    ".npmrc",
    ".env",
    "credentials.json",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
]);
exports.FORBIDDEN_UPLOAD_PATTERNS = [/^\.env(\..+)?$/];
