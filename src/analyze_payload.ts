import path from "node:path";

import {
  FORBIDDEN_UPLOAD_BASENAMES,
  FORBIDDEN_UPLOAD_PATTERNS,
  LOCKFILE_TO_MANAGER,
  PACKAGE_MANAGERS,
  SUPPORTED_PACKAGE_JSON_BASENAME,
  SUPPORTED_LOCKFILE_NAMES,
} from "./constants";
import { fail } from "./cli_error";
import { readText } from "./read_text";
import type { CommandOptions, JsonObject, ReadTextFn } from "./types";

type AnalyzeFileOption = "--lockfile" | "--package-json";

const ALLOWED_ANALYZE_BASENAMES: Record<AnalyzeFileOption, ReadonlySet<string>> = {
  "--lockfile": SUPPORTED_LOCKFILE_NAMES,
  "--package-json": new Set([SUPPORTED_PACKAGE_JSON_BASENAME]),
};

export function inferManager(lockfilePath: string): string | null {
  return LOCKFILE_TO_MANAGER[path.basename(lockfilePath)] ?? null;
}

function isForbiddenUploadBasename(fileName: string): boolean {
  return (
    FORBIDDEN_UPLOAD_BASENAMES.has(fileName) ||
    FORBIDDEN_UPLOAD_PATTERNS.some((pattern) => pattern.test(fileName))
  );
}

function getAllowedAnalyzeBasenames(optionName: AnalyzeFileOption): ReadonlySet<string> {
  return ALLOWED_ANALYZE_BASENAMES[optionName];
}

function getInvalidAnalyzeBasenameMessage(optionName: AnalyzeFileOption): string {
  if (optionName === "--package-json") {
    return `--package-json only accepts files named ${SUPPORTED_PACKAGE_JSON_BASENAME}.`;
  }

  return "--lockfile only accepts package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock.";
}

function validateAnalyzeBasename(optionName: AnalyzeFileOption, fileName: string): void {
  if (isForbiddenUploadBasename(fileName)) {
    fail(`Refusing to send sensitive file via ${optionName}: ${fileName}`);
  }

  if (fileName === "bun.lockb") {
    fail("bun.lockb is not supported. Use bun.lock text format instead.");
  }

  if (!getAllowedAnalyzeBasenames(optionName).has(fileName)) {
    fail(getInvalidAnalyzeBasenameMessage(optionName));
  }
}

function validateAnalyzeFilePath(optionName: AnalyzeFileOption, filePath: string): void {
  validateAnalyzeBasename(optionName, path.basename(filePath));
}

export function createAnalyzePayload(
  options: CommandOptions,
  readTextFn: ReadTextFn = readText,
): JsonObject {
  const lockfile = typeof options.lockfile === "string" ? options.lockfile : undefined;
  const packageJson = typeof options.packageJson === "string" ? options.packageJson : undefined;
  const explicitManager = typeof options.manager === "string" ? options.manager : undefined;
  const manager = explicitManager ?? (lockfile ? inferManager(lockfile) : null);

  if (!lockfile && !packageJson) {
    fail("Provide --lockfile and/or --package-json.");
  }

  if (lockfile) {
    validateAnalyzeFilePath("--lockfile", lockfile);
  }

  if (packageJson) {
    validateAnalyzeFilePath("--package-json", packageJson);
  }

  if (lockfile && !manager) {
    fail("Could not infer package manager. Pass --manager explicitly.");
  }

  if (manager && !PACKAGE_MANAGERS.has(manager)) {
    fail("--manager must be one of npm, pnpm, yarn, bun.");
  }

  if (options.metadataCheck && !packageJson) {
    fail("--metadata-check requires --package-json.");
  }

  const payload: JsonObject = {};

  if (lockfile) {
    payload.lockfileContent = readTextFn(lockfile);
    payload.manager = manager as string;
  }

  if (packageJson) {
    payload.packageJsonContent = readTextFn(packageJson);
  }

  if (options.metadataCheck) {
    payload.options = { enableMetadataCheck: true };
  }

  return payload;
}
