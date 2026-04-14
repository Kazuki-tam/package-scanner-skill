import { afterEach, describe, expect, it, vi } from "vitest";

import { executeCommand } from "../src/package_scanner";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("executeCommand", () => {
  it("prints usage for help without hitting the network", async () => {
    const writeStdout = vi.fn();
    const requestJsonMock = vi.fn();

    await executeCommand(["--help"], { requestJson: requestJsonMock, writeStdout });

    expect(requestJsonMock).not.toHaveBeenCalled();
    expect(writeStdout).toHaveBeenCalledOnce();
    expect(writeStdout.mock.calls[0]?.[0]).toContain("PackageScanner CLI helper");
  });

  it("calls the search endpoint and prints the response", async () => {
    const writeStdout = vi.fn();
    const requestJsonMock = vi.fn().mockResolvedValue({ ok: true });

    await executeCommand(["search", "--name", "left-pad", "--version", "1.3.0"], {
      requestJson: requestJsonMock,
      writeStdout,
    });

    expect(requestJsonMock).toHaveBeenCalledWith(
      "GET",
      "https://www.package-scanner.dev/api/malware-db/search?name=left-pad&version=1.3.0",
      { timeout: 120 },
    );
    expect(writeStdout).toHaveBeenCalledWith('{\n  "ok": true\n}\n');
  });

  it.each([
    [
      "health",
      ["health", "--base-url", "https://mirror.example/api", "--timeout", "5"],
      "GET",
      "https://mirror.example/api/health",
      { timeout: 5 },
    ],
    [
      "metadata",
      ["metadata", "--name", "left-pad"],
      "GET",
      "https://www.package-scanner.dev/api/package/metadata?name=left-pad",
      { timeout: 120 },
    ],
    [
      "vulnerabilities",
      ["vulnerabilities", "--name", "left-pad"],
      "GET",
      "https://www.package-scanner.dev/api/package/vulnerabilities?name=left-pad",
      { timeout: 120 },
    ],
    [
      "report",
      ["report", "--analysis-id", "abc123"],
      "GET",
      "https://www.package-scanner.dev/api/report/abc123",
      { timeout: 120 },
    ],
  ])("dispatches the %s command", async (_label, argv, method, url, options) => {
    const writeStdout = vi.fn();
    const requestJsonMock = vi.fn().mockResolvedValue({ ok: true });

    await executeCommand(argv, { requestJson: requestJsonMock, writeStdout });

    expect(requestJsonMock).toHaveBeenCalledWith(method, url, options);
    expect(writeStdout).toHaveBeenCalledWith('{\n  "ok": true\n}\n');
  });

  it("builds analyze payload from injected file contents", async () => {
    const writeStdout = vi.fn();
    const readTextMock = vi.fn((filePath: string) => `${filePath}-contents`);
    const requestJsonMock = vi.fn().mockResolvedValue({ analysisId: "abc123" });

    await executeCommand(
      ["analyze", "--lockfile", "package-lock.json", "--package-json", "package.json"],
      {
        readText: readTextMock,
        requestJson: requestJsonMock,
        writeStdout,
      },
    );

    expect(requestJsonMock).toHaveBeenCalledWith(
      "POST",
      "https://www.package-scanner.dev/api/ci/analyze",
      {
        payload: {
          lockfileContent: "package-lock.json-contents",
          manager: "npm",
          packageJsonContent: "package.json-contents",
        },
        timeout: 120,
      },
    );
    expect(writeStdout).toHaveBeenCalledWith('{\n  "analysisId": "abc123"\n}\n');
  });

  it("surfaces unknown commands and missing required options", async () => {
    await expect(executeCommand(["unknown-command"])).rejects.toThrow(
      "Unknown command: unknown-command",
    );
    await expect(executeCommand(["search"])).rejects.toThrow("Missing required option: --name");
  });
});
