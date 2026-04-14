#!/usr/bin/env node

export type {
  JsonPrimitive,
  JsonValue,
  JsonObject,
  CommandOptions,
  ParsedArgv,
  ReadTextFn,
  RequestJsonFn,
  WriteFn,
} from "./types";
export { CliError } from "./cli_error";
export { DEFAULT_BASE_URL } from "./constants";
export { printUsage, printJson } from "./print";
export { readText } from "./read_text";
export { inferManager, createAnalyzePayload } from "./analyze_payload";
export { buildUrl } from "./url";
export { requestJson } from "./request_json";
export { parseArgv } from "./argv";
export { getTimeout, getBaseUrl, requireOption } from "./options";
export { executeCommand } from "./execute_command";

import { executeCommand } from "./execute_command";

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  await executeCommand(argv);
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
