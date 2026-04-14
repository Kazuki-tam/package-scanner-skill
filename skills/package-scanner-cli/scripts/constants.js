"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCKFILE_TO_MANAGER = exports.PACKAGE_MANAGERS = exports.DEFAULT_BASE_URL = void 0;
exports.DEFAULT_BASE_URL = "https://www.package-scanner.dev/api";
exports.PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
exports.LOCKFILE_TO_MANAGER = {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "bun.lock": "bun",
};
