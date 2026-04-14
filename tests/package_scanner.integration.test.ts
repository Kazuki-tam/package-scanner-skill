import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { withHttpServer } from "./helpers";

const execFileAsync = promisify(execFile);
const BUILT_CLI_PATH = new URL(
  "../skills/package-scanner-cli/scripts/package_scanner.js",
  import.meta.url,
);

describe("built CLI integration", () => {
  it("prints help from the built artifact", async () => {
    const { stdout, stderr } = await execFileAsync("node", [BUILT_CLI_PATH.pathname, "--help"]);

    expect(stderr).toBe("");
    expect(stdout).toContain("PackageScanner CLI helper");
    expect(stdout).toContain("search --name <package>");
  });

  it("returns a non-zero exit code and stderr for invalid input", async () => {
    await expect(execFileAsync("node", [BUILT_CLI_PATH.pathname, "search"])).rejects.toMatchObject({
      code: 1,
      stdout: "",
      stderr: "Missing required option: --name\n",
    });
  });

  it("talks to a custom base URL and prints the JSON response", async () => {
    await withHttpServer(
      (req, res) => {
        expect(req.method).toBe("GET");
        expect(req.url).toBe("/health");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      },
      async (baseUrl) => {
        const { stdout, stderr } = await execFileAsync("node", [
          BUILT_CLI_PATH.pathname,
          "health",
          "--base-url",
          baseUrl,
          "--timeout",
          "2",
        ]);

        expect(stderr).toBe("");
        expect(stdout).toBe('{\n  "ok": true\n}\n');
      },
    );
  });
});
