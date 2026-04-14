import { createAnalyzePayload } from "./analyze_payload";
import { fail } from "./cli_error";
import { getBaseUrl, getTimeout, requireOption } from "./options";
import { parseArgv } from "./argv";
import { printJson, printUsage } from "./print";
import { readText } from "./read_text";
import { requestJson } from "./request_json";
import { buildUrl } from "./url";
import type { CommandOptions, JsonObject, ReadTextFn, RequestJsonFn, WriteFn } from "./types";

type CommandContext = {
  readText: ReadTextFn;
  requestJson: RequestJsonFn;
  writeStdout: WriteFn;
};

type CommandRuntime = {
  baseUrl: string;
  context: CommandContext;
  options: CommandOptions;
  timeout: number;
};

type CommandHandler = (runtime: CommandRuntime) => Promise<void>;

function createCommandContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    readText,
    requestJson,
    writeStdout: (text) => {
      process.stdout.write(text);
    },
    ...overrides,
  };
}

async function fetchAndPrintJson(
  method: string,
  url: string,
  context: CommandContext,
  options: { payload?: JsonObject; timeout?: number } = {},
): Promise<void> {
  printJson(await context.requestJson(method, url, options), context.writeStdout);
}

function getOptionalString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function fetchNamedPackageJson(
  pathname: string,
  { baseUrl, context, options, timeout }: CommandRuntime,
): Promise<void> {
  const url = buildUrl(baseUrl, pathname, {
    name: requireOption(options, "name"),
    version: getOptionalString(options.version),
  });
  await fetchAndPrintJson("GET", url, context, { timeout });
}

function createGetHandler(pathname: string): CommandHandler {
  return async ({ baseUrl, context, timeout }) => {
    const url = buildUrl(baseUrl, pathname);
    await fetchAndPrintJson("GET", url, context, { timeout });
  };
}

function createNamedPackageHandler(pathname: string): CommandHandler {
  return async (runtime) => {
    await fetchNamedPackageJson(pathname, runtime);
  };
}

function createReportHandler(): CommandHandler {
  return async ({ baseUrl, context, options, timeout }) => {
    const url = buildUrl(baseUrl, `/report/${requireOption(options, "analysisId")}`);
    await fetchAndPrintJson("GET", url, context, { timeout });
  };
}

function createAnalyzeHandler(): CommandHandler {
  return async ({ baseUrl, context, options, timeout }) => {
    const url = buildUrl(baseUrl, "/ci/analyze");
    const payload = createAnalyzePayload(options, context.readText);
    await fetchAndPrintJson("POST", url, context, { payload, timeout });
  };
}

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  health: createGetHandler("/health"),
  search: createNamedPackageHandler("/malware-db/search"),
  metadata: createNamedPackageHandler("/package/metadata"),
  vulnerabilities: createNamedPackageHandler("/package/vulnerabilities"),
  report: createReportHandler(),
  analyze: createAnalyzeHandler(),
};

export async function executeCommand(
  argv: string[],
  contextOverrides: Partial<CommandContext> = {},
): Promise<void> {
  const parsed = parseArgv(argv);
  const context = createCommandContext(contextOverrides);

  if ("help" in parsed) {
    printUsage(context.writeStdout);
    return;
  }

  const timeout = getTimeout(parsed.options.timeout);
  const baseUrl = getBaseUrl(parsed.options.baseUrl);

  const handler = COMMAND_HANDLERS[parsed.command];
  if (!handler) {
    fail(`Unknown command: ${parsed.command}`);
  }

  await handler({
    baseUrl,
    context,
    options: parsed.options,
    timeout,
  });
}
