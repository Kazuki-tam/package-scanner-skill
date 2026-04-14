import { DEFAULT_BASE_URL } from "./constants";
import { fail } from "./cli_error";
import type { CommandOptions } from "./types";

export function getTimeout(value: string | boolean | undefined): number {
  if (value === undefined) {
    return 120;
  }

  if (typeof value !== "string") {
    fail("--timeout must be a positive number");
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail("--timeout must be a positive number");
  }

  return parsed;
}

export function getBaseUrl(value: string | boolean | undefined): string {
  return typeof value === "string" && value ? value : DEFAULT_BASE_URL;
}

export function requireOption(options: CommandOptions, name: string): string {
  const value = options[name];

  if (typeof value !== "string" || value.length === 0) {
    const cliName = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    fail(`Missing required option: --${cliName}`);
  }

  return value;
}
