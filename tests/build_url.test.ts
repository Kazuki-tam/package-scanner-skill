import { describe, expect, it } from "vitest";

import { buildUrl, DEFAULT_BASE_URL } from "../src/package_scanner";

describe("buildUrl", () => {
  it("normalizes base path and omits empty query params", () => {
    expect(
      buildUrl(`${DEFAULT_BASE_URL}/`, "/package/metadata", {
        name: "left-pad",
        version: "",
      }),
    ).toBe("https://www.package-scanner.dev/api/package/metadata?name=left-pad");
  });

  it("supports base URLs without a trailing slash", () => {
    expect(buildUrl("https://example.com/api", "health")).toBe("https://example.com/api/health");
  });
});
