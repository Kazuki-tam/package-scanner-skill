export const DEFAULT_BASE_URL = "https://www.package-scanner.dev/api";

export const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

export const LOCKFILE_TO_MANAGER: Record<string, string> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
};

export const SUPPORTED_PACKAGE_JSON_BASENAME = "package.json";
export const SUPPORTED_LOCKFILE_NAMES = new Set(Object.keys(LOCKFILE_TO_MANAGER));

export const FORBIDDEN_UPLOAD_BASENAMES = new Set([
  ".npmrc",
  ".env",
  "credentials.json",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
]);

export const FORBIDDEN_UPLOAD_PATTERNS = [/^\.env(\..+)?$/];
