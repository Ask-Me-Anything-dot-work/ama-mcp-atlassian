import { describe, it, expect, vi } from "vitest";
import { setupConfigTest } from "./helpers/config-setup.js";

describe("config - registry fetch", () => {
  setupConfigTest();

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
});
