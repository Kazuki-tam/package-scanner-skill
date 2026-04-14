import { describe, expect, it } from "vitest";

import { parseArgv } from "../src/package_scanner";

describe("parseArgv", () => {
  it("parses kebab-case options into camelCase keys", () => {
    expect(
      parseArgv([
        "analyze",
        "--lockfile",
        "pnpm-lock.yaml",
        "--package-json",
        "package.json",
        "--metadata-check",
      ]),
    ).toEqual({
      command: "analyze",
      options: {
        lockfile: "pnpm-lock.yaml",
        packageJson: "package.json",
        metadataCheck: true,
      },
    });
  });

  it("returns help for empty input and explicit help flags", () => {
    expect(parseArgv([])).toEqual({ help: true });
    expect(parseArgv(["-h"])).toEqual({ help: true });
    expect(parseArgv(["search", "--help"])).toEqual({ help: true });
  });

  it("throws on malformed arguments", () => {
    expect(() => parseArgv(["search", "leftover"])).toThrow("Unexpected argument: leftover");
    expect(() => parseArgv(["search", "--name"])).toThrow("Missing value for --name");
  });
});
