import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// eslint-disable-next-line max-lines-per-function -- Config tests cover multiple code paths
describe("config", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...envBackup };
    delete process.env.ATLASSIAN_ACCESS_TOKEN;
    delete process.env.ATLASSIAN_CLOUD_ID;
    delete process.env.REGISTRY_URL;
    delete process.env.INSTANCE_ID;
    delete process.env.GATEWAY_PSK;
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("resolves token from env vars (standalone mode)", async () => {
    process.env.ATLASSIAN_ACCESS_TOKEN = "test-token";
    process.env.ATLASSIAN_CLOUD_ID = "test-cloud-id";

    const { getToken, getCloudId } = await import("../src/config.js");
    expect(await getToken()).toBe("test-token");
    expect(await getCloudId()).toBe("test-cloud-id");
  });

  it("fetches from registry when no env vars set", async () => {
    process.env.REGISTRY_URL = "https://registry.example.com";
    process.env.INSTANCE_ID = "inst-123";
    process.env.GATEWAY_PSK = "psk-secret";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          oauth: {
            access_token: "reg-token",
            expires_at: Date.now() + 3600_000,
            cloud_id: "reg-cloud-id",
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { getToken, getCloudId } = await import("../src/config.js");
    expect(await getToken()).toBe("reg-token");
    expect(await getCloudId()).toBe("reg-cloud-id");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://registry.example.com/instances/inst-123/secrets",
      expect.objectContaining({
        headers: { Authorization: "Bearer psk-secret" },
      }),
    );
  });

  it("throws when registry env vars incomplete", async () => {
    process.env.REGISTRY_URL = "https://registry.example.com";
    delete process.env.INSTANCE_ID;
    delete process.env.GATEWAY_PSK;

    const { getToken } = await import("../src/config.js");
    await expect(getToken()).rejects.toThrow(
      "Registry mode requires REGISTRY_URL, INSTANCE_ID, and GATEWAY_PSK",
    );
  });

  it("caches token after first fetch", async () => {
    process.env.ATLASSIAN_ACCESS_TOKEN = "cached-token";
    process.env.ATLASSIAN_CLOUD_ID = "cached-cloud-id";

    const { getToken } = await import("../src/config.js");
    const t1 = await getToken();
    const t2 = await getToken();
    expect(t1).toBe(t2);
  });

  it("re-fetches when token expires (standalone with short expiry via registry)", async () => {
    process.env.REGISTRY_URL = "https://registry.example.com";
    process.env.INSTANCE_ID = "inst-123";
    process.env.GATEWAY_PSK = "psk-secret";

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            oauth: {
              access_token: `token-${callCount}`,
              expires_at: callCount === 1 ? Date.now() - 1 : Date.now() + 3600_000,
              cloud_id: "cloud-id",
            },
          }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { getToken } = await import("../src/config.js");
    const t1 = await getToken();
    expect(t1).toBe("token-1");

    const t2 = await getToken();
    expect(t2).toBe("token-2");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("standalone mode ignores registry env vars", async () => {
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
