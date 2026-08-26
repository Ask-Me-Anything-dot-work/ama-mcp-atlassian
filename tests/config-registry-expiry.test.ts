import { describe, it, expect, vi } from "vitest";
import { setupConfigTest } from "./helpers/config-setup.js";

describe("config - registry expiry", () => {
  setupConfigTest();

  it("re-fetches when token expires", async () => {
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
});
