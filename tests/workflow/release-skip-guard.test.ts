import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("@semantic-release/commit-analyzer", () => ({
  analyzeCommits: vi.fn(),
}));

import * as commitAnalyzer from "@semantic-release/commit-analyzer";

const ROOT = join(import.meta.dirname, "../..");
const PLUGIN_CONFIG = { preset: "conventionalcommits", parserOpts: { commentChar: null } };
const delegated = vi.mocked(commitAnalyzer.analyzeCommits);

type Commit = { message: string };
type Logger = { log: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

function makeContext(commits: Commit[]): { commits: Commit[]; cwd: string; logger: Logger } {
  return { commits, cwd: ROOT, logger: { log: vi.fn(), warn: vi.fn() } };
}

let summaryFile: string;

beforeEach(() => {
  delegated.mockReset();
  const dir = mkdtempSync(join(tmpdir(), "skip-guard-"));
  summaryFile = join(dir, "step-summary.md");
  writeFileSync(summaryFile, "");
  vi.stubEnv("GITHUB_STEP_SUMMARY", summaryFile);
  vi.stubEnv("GITHUB_ACTIONS", "false");
  vi.stubEnv("NTFY_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("release-skip-guard — delegation + skip detection", () => {
  it("returns the delegated release type unchanged and does not warn", async () => {
    delegated.mockResolvedValue("patch");
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([{ message: "fix: x" }]);

    const result = await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    expect(result).toBe("patch");
    expect(delegated).toHaveBeenCalledWith(PLUGIN_CONFIG, context);
    expect(context.logger.warn).not.toHaveBeenCalled();
    expect(readFileSync(summaryFile, "utf8")).toBe("");
  });

  it("warns + appends job summary when skip happens with commits in range", async () => {
    delegated.mockResolvedValue(null);
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([
      { message: "docs: update readme" },
      { message: "chore: bump deps" },
    ]);

    const result = await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    expect(result).toBeNull();
    expect(context.logger.warn).toHaveBeenCalledTimes(2);
    const summary = readFileSync(summaryFile, "utf8");
    expect(summary).toContain("semantic-release skip detected");
    expect(summary).toContain("- docs: update readme");
    expect(summary).toContain("- chore: bump deps");
  });

  it("stays silent on an empty commit range", async () => {
    delegated.mockResolvedValue(null);
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([]);

    const result = await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    expect(result).toBeNull();
    expect(context.logger.warn).not.toHaveBeenCalled();
    expect(readFileSync(summaryFile, "utf8")).toBe("");
  });
});

describe("release-skip-guard — surfacing channels", () => {
  it("posts to ntfy when NTFY_TOKEN is set and swallows fetch failures", async () => {
    delegated.mockResolvedValue(null);
    vi.stubEnv("NTFY_TOKEN", "test-token");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([{ message: "docs: stranded fix" }]);

    await expect(plugin.analyzeCommits(PLUGIN_CONFIG, context)).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("ama-mcp-atlassian");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(init.headers.Priority).toBe("default");
    expect(init.headers.Tags).toBe("warning");
    expect(init.body).toContain("docs: stranded fix");
  });

  it("emits a ::warning:: annotation under GitHub Actions", async () => {
    delegated.mockResolvedValue(null);
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([{ message: "docs: x" }]);

    await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    const annotation = logSpy.mock.calls.flat().find((c) => String(c).startsWith("::warning::"));
    expect(annotation).toBeDefined();
    logSpy.mockRestore();
  });
});
