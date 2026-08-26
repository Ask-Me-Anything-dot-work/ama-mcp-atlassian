import { describe, it, expect, vi } from "vitest";
import { setupConfigTest } from "./helpers/config-setup.js";

describe("config - standalone mode", () => {
  setupConfigTest();

  it("resolves token from env vars", async () => {
    process.env.ATLASSIAN_ACCESS_TOKEN = "test-token";
    process.env.ATLASSIAN_CLOUD_ID = "test-cloud-id";

    const { getToken, getCloudId } = await import("../src/config.js");
    expect(await getToken()).toBe("test-token");
    expect(await getCloudId()).toBe("test-cloud-id");
  });

  it("caches token after first fetch", async () => {
    process.env.ATLASSIAN_ACCESS_TOKEN = "cached-token";
    process.env.ATLASSIAN_CLOUD_ID = "cached-cloud-id";

    const { getToken } = await import("../src/config.js");
    const t1 = await getToken();
    const t2 = await getToken();
    expect(t1).toBe(t2);
  });

  it("ignores registry env vars", async () => {
    process.env.ATLASSIAN_ACCESS_TOKEN = "standalone-token";
    process.env.ATLASSIAN_CLOUD_ID = "standalone-cloud-id";
    process.env.REGISTRY_URL = "https://should-not-be-called.example.com";
    process.env.INSTANCE_ID = "inst-123";
    process.env.GATEWAY_PSK = "psk-secret";

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { getToken } = await import("../src/config.js");
    expect(await getToken()).toBe("standalone-token");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
