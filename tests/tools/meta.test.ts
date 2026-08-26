import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config.js", () => ({
  getToken: vi.fn().mockResolvedValue("test-token"),
}));

import { registerMetaTools } from "../../src/tools/meta.js";

function createMockServer() {
  const handlers: Record<string, unknown> = {};
  return {
    tool: vi.fn(
      (name: string, _d: string, _s: unknown, h: (i: Record<string, unknown>) => Promise<unknown>) => {
        handlers[name] = h;
      },
    ),
    handlers,
  };
}

describe("atlassian_whoami", () => {
  let server: ReturnType<typeof createMockServer>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerMetaTools(server as never);
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("fetches user info from api.atlassian.com/me", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ accountId: "abc", displayName: "Test User" }),
    });
    const h = server.handlers.atlassian_whoami as (i: Record<string, unknown>) => Promise<unknown>;
    const result = await h({});
    expect(fetchSpy).toHaveBeenCalledWith("https://api.atlassian.com/me", {
      headers: { Authorization: "Bearer test-token" },
    });
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain("abc");
    expect(text).toContain("Test User");
  });

  it("returns error on non-ok response", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" });
    const h = server.handlers.atlassian_whoami as (i: Record<string, unknown>) => Promise<unknown>;
    const result = await h({});
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain("error");
    expect(text).toContain("401");
  });
});
