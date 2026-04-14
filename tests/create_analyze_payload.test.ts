import { describe, expect, it } from "vitest";

import { createAnalyzePayload } from "../src/package_scanner";

describe("createAnalyzePayload", () => {
  it.each([
    ["package-lock.json", "npm"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
  ])("accepts supported lockfiles and infers %s as %s", (lockfileName, manager) => {
    const payload = createAnalyzePayload(
      {
        lockfile: `/tmp/nested/${lockfileName}`,
        packageJson: "/tmp/project/package.json",
        metadataCheck: true,
      },
      (filePath) => `${filePath}-content`,
    );

    expect(payload).toEqual({
      lockfileContent: `/tmp/nested/${lockfileName}-content`,
      manager,
      packageJsonContent: "/tmp/project/package.json-content",
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

  it.each([
    [{}, "Provide --lockfile and/or --package-json."],
    [
      {
        lockfile: "/tmp/unknown.lock",
      },
      "--lockfile only accepts package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock.",
    ],
    [
      {
        lockfile: "/tmp/custom.lock",
        manager: "bun",
      },
      "--lockfile only accepts package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock.",
    ],
    [
      {
        lockfile: "/tmp/package-lock.json",
        manager: "composer",
      },
      "--manager must be one of npm, pnpm, yarn, bun.",
    ],
    [
      {
        lockfile: "/tmp/package-lock.json",
        metadataCheck: true,
      },
      "--metadata-check requires --package-json.",
    ],
    [
      {
        lockfile: "/tmp/bun.lockb",
      },
      "bun.lockb is not supported. Use bun.lock text format instead.",
    ],
    [
      {
        packageJson: "/tmp/app.json",
      },
      "--package-json only accepts files named package.json.",
    ],
  ])("rejects invalid analyze options: %j", (options, message) => {
    expect(() => createAnalyzePayload(options, () => "unused")).toThrow(message);
  });

  it.each([
    [
      {
        packageJson: "/tmp/.env.production",
      },
      "Refusing to send sensitive file via --package-json: .env.production",
    ],
    [
      {
        lockfile: "/tmp/.npmrc",
      },
      "Refusing to send sensitive file via --lockfile: .npmrc",
    ],
    [
      {
        lockfile: "/tmp/secrets/credentials.json",
      },
      "Refusing to send sensitive file via --lockfile: credentials.json",
    ],
    [
      {
        packageJson: "/tmp/.ssh/id_ed25519",
      },
      "Refusing to send sensitive file via --package-json: id_ed25519",
    ],
  ])("rejects sensitive filenames: %j", (options, message) => {
    expect(() => createAnalyzePayload(options, () => "unused")).toThrow(message);
  });

  it("prioritizes sensitive filename rejection over generic basename errors", () => {
    expect(() =>
      createAnalyzePayload(
        {
          packageJson: "/tmp/.env",
        },
        () => "unused",
      ),
    ).toThrow("Refusing to send sensitive file via --package-json: .env");
  });
});
