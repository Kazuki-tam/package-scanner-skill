"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printUsage = printUsage;
exports.printJson = printJson;
const defaultWriteStdout = (text) => {
    process.stdout.write(text);
};
function printUsage(write = defaultWriteStdout) {
    const usage = `PackageScanner CLI helper

Usage:
  node scripts/package_scanner.js <command> [options]

Commands:
  health
  search --name <package> [--version <version>]
  metadata --name <package> [--version <version>]
  vulnerabilities --name <package> [--version <version>]
  report --analysis-id <id>
  analyze [--lockfile <path>] [--package-json <path>] [--manager <npm|pnpm|yarn|bun>] [--metadata-check]

Common options:
  --base-url <url>   PackageScanner API base URL
  --timeout <secs>   Request timeout in seconds (default: 120)
  --help             Show this message
`;
    write(`${usage}\n`);
}
function printJson(payload, write = defaultWriteStdout) {
    write(`${JSON.stringify(payload, null, 2)}\n`);
}
