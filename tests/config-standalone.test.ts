import { describe, it, expect, vi } from "vitest";
import { setupConfigTest } from "./helpers/config-setup.js";

describe("config - standalone mode (Basic Auth)", () => {
  setupConfigTest();

  it("resolves Basic Auth from env vars", async () => {
    process.env.ATLASSIAN_EMAIL = "test@example.com";
    process.env.ATLASSIAN_API_TOKEN = "test-api-token";
    process.env.ATLASSIAN_CLOUD_ID = "test-cloud-id";

    const { getAuthConfig } = await import("../src/config.js");
    const config = await getAuthConfig();
    expect(config).toEqual({
      mode: "basic",
      email: "test@example.com",
      apiToken: "test-api-token",
      cloudId: "test-cloud-id",
    });
  });

  it("caches token after first fetch", async () => {
    process.env.ATLASSIAN_EMAIL = "test@example.com";
    process.env.ATLASSIAN_API_TOKEN = "cached-token";
    process.env.ATLASSIAN_CLOUD_ID = "test-cloud-id";

    const { getToken } = await import("../src/config.js");
    const t1 = await getToken();
    const t2 = await getToken();
    expect(t1).toBe(t2);
  });

  it("ignores registry env vars when Basic Auth is set", async () => {
    process.env.ATLASSIAN_EMAIL = "test@example.com";
    process.env.ATLASSIAN_API_TOKEN = "basic-token";
    process.env.ATLASSIAN_CLOUD_ID = "basic-cloud-id";
    process.env.REGISTRY_URL = "https://should-not-be-called.example.com";
    process.env.INSTANCE_ID = "inst-123";
    process.env.GATEWAY_PSK = "psk-secret";

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { getAuthConfig } = await import("../src/config.js");
    const config = await getAuthConfig();
    expect(config.mode).toBe("basic");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("config - standalone mode (OAuth)", () => {
  setupConfigTest();

  it("resolves OAuth from env vars", async () => {
    process.env.ATLASSIAN_ACCESS_TOKEN = "test-token";
    process.env.ATLASSIAN_CLOUD_ID = "test-cloud-id";

    const { getAuthConfig } = await import("../src/config.js");
    const config = await getAuthConfig();
    expect(config).toEqual({
      mode: "oauth2",
      token: "test-token",
      cloudId: "test-cloud-id",
    });
  });

  it("prefers Basic Auth over OAuth when both are set", async () => {
    process.env.ATLASSIAN_EMAIL = "test@example.com";
    process.env.ATLASSIAN_API_TOKEN = "basic-token";
    process.env.ATLASSIAN_ACCESS_TOKEN = "oauth-token";
    process.env.ATLASSIAN_CLOUD_ID = "test-cloud-id";

    const { getAuthConfig } = await import("../src/config.js");
    const config = await getAuthConfig();
    expect(config.mode).toBe("basic");
  });
});
