import path from "node:path";

import { LOCKFILE_TO_MANAGER, PACKAGE_MANAGERS } from "./constants";
import { fail } from "./cli_error";
import { readText } from "./read_text";
import type { CommandOptions, JsonObject, ReadTextFn } from "./types";

export function inferManager(lockfilePath: string): string | null {
  return LOCKFILE_TO_MANAGER[path.basename(lockfilePath)] ?? null;
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

  if (lockfile && path.basename(lockfile) === "bun.lockb") {
    fail("bun.lockb is not supported. Use bun.lock text format instead.");
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
