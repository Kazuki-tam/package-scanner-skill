import { describe, expect, it } from "vitest";

import { createAnalyzePayload } from "../src/package_scanner";

describe("createAnalyzePayload", () => {
  it("infers the package manager from the lockfile name", () => {
    const payload = createAnalyzePayload(
      {
        lockfile: "/tmp/pnpm-lock.yaml",
        packageJson: "/tmp/package.json",
        metadataCheck: true,
      },
      (filePath) => `${filePath}-content`,
    );

    expect(payload).toEqual({
      lockfileContent: "/tmp/pnpm-lock.yaml-content",
      manager: "pnpm",
      packageJsonContent: "/tmp/package.json-content",
      options: { enableMetadataCheck: true },
    });
  });

  it("allows package-json only payloads", () => {
    expect(
      createAnalyzePayload(
        {
          packageJson: "/tmp/package.json",
        },
        () => '{"name":"demo"}',
      ),
    ).toEqual({
      packageJsonContent: '{"name":"demo"}',
    });
  });

  it("accepts an explicit manager when inference is not possible", () => {
    expect(
      createAnalyzePayload(
        {
          lockfile: "/tmp/custom.lock",
          manager: "bun",
        },
        () => "lock-content",
      ),
    ).toEqual({
      lockfileContent: "lock-content",
      manager: "bun",
    });
  });

  it("rejects invalid analyze argument combinations", () => {
    expect(() => createAnalyzePayload({}, () => "unused")).toThrow(
      "Provide --lockfile and/or --package-json.",
    );
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/unknown.lock",
        },
        () => "unused",
      ),
    ).toThrow("Could not infer package manager. Pass --manager explicitly.");
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/package-lock.json",
          manager: "composer",
        },
        () => "unused",
      ),
    ).toThrow("--manager must be one of npm, pnpm, yarn, bun.");
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/package-lock.json",
          metadataCheck: true,
        },
        () => "unused",
      ),
    ).toThrow("--metadata-check requires --package-json.");
    expect(() =>
      createAnalyzePayload(
        {
          lockfile: "/tmp/bun.lockb",
        },
        () => "unused",
      ),
    ).toThrow("bun.lockb is not supported. Use bun.lock text format instead.");
  });
});
