export const DEFAULT_BASE_URL = "https://www.package-scanner.dev/api";

export const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

export const LOCKFILE_TO_MANAGER: Record<string, string> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
};
