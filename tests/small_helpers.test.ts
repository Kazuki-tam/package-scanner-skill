import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CliError,
  DEFAULT_BASE_URL,
  getBaseUrl,
  getTimeout,
  inferManager,
  printJson,
  printUsage,
  readText,
  requireOption,
} from "../src/package_scanner";
import { createTempFile, removeTempFile } from "./helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("small helpers", () => {
  it("creates named CLI errors", () => {
    expect(new CliError("boom")).toMatchObject({
      message: "boom",
      name: "CliError",
    });
  });

  it("reads file contents from disk", async () => {
    const filePath = await createTempFile("hello");

    try {
      expect(readText(filePath)).toBe("hello");
    } finally {
      await removeTempFile(filePath);
    }
  });

  it("infers supported package managers from lockfile names", () => {
    expect(inferManager("/tmp/package-lock.json")).toBe("npm");
    expect(inferManager("/tmp/pnpm-lock.yaml")).toBe("pnpm");
    expect(inferManager("/tmp/yarn.lock")).toBe("yarn");
    expect(inferManager("/tmp/bun.lock")).toBe("bun");
    expect(inferManager("/tmp/unknown.lock")).toBeNull();
  });

  it("parses timeout values and falls back to the default", () => {
    expect(getTimeout(undefined)).toBe(120);
    expect(getTimeout("30")).toBe(30);
  });

  it("rejects invalid timeout values", () => {
    expect(() => getTimeout(true)).toThrow("--timeout must be a positive number");
    expect(() => getTimeout("0")).toThrow("--timeout must be a positive number");
    expect(() => getTimeout("NaN")).toThrow("--timeout must be a positive number");
  });

  it("resolves the default and custom base URLs", () => {
    expect(getBaseUrl(undefined)).toBe(DEFAULT_BASE_URL);
    expect(getBaseUrl("https://example.com/api")).toBe("https://example.com/api");
  });

  it("requires named options", () => {
    expect(requireOption({ name: "left-pad" }, "name")).toBe("left-pad");
    expect(() => requireOption({}, "analysisId")).toThrow("Missing required option: --analysis-id");
  });

  it("writes usage text with the provided sink", () => {
    const write = vi.fn();

    printUsage(write);

    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]?.[0]).toContain("PackageScanner CLI helper");
    expect(write.mock.calls[0]?.[0]).toContain("analyze");
  });

  it("writes JSON to the provided sink", () => {
    const write = vi.fn();

    printJson({ ok: true }, write);

    expect(write).toHaveBeenCalledWith('{\n  "ok": true\n}\n');
  });

  it("uses process.stdout by default for usage and JSON output", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    printUsage();
    printJson({ ok: true });

    expect(stdoutSpy).toHaveBeenCalled();
  });
});
