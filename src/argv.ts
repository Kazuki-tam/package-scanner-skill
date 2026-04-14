import { fail } from "./cli_error";
import type { CommandOptions, ParsedArgv } from "./types";

export function parseArgv(argv: string[]): ParsedArgv {
  const args = [...argv];

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  const command = args.shift();
  if (!command) {
    return { help: true };
  }

  const options: CommandOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      fail(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);

    if (key === "metadata-check") {
      options.metadataCheck = true;
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      fail(`Missing value for --${key}`);
    }

    const normalizedKey = key.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
    options[normalizedKey] = next;
    index += 1;
  }

  return { command, options };
}
