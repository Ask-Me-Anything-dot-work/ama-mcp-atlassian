import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
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

beforeEach(async () => {
  delegated.mockReset();
  const actual = await vi.importActual<typeof import("@semantic-release/commit-analyzer")>(
    "@semantic-release/commit-analyzer",
  );
  delegated.mockImplementation(actual.analyzeCommits);
  const dir = mkdtempSync(join(tmpdir(), "skip-guard-int-"));
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

describe("release-skip-guard — integration (real commit-analyzer)", () => {
  it("releasing commit → minor, no skip surfaced", async () => {
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([{ message: "feat: add tool" }]);

    const result = await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    expect(result).toBe("minor");
    expect(context.logger.warn).not.toHaveBeenCalled();
    expect(readFileSync(summaryFile, "utf8")).toBe("");
  });

  it("non-releasing commits → null + skip surfaced", async () => {
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([
      { message: "docs: update readme" },
      { message: "chore: tidy" },
    ]);

    const result = await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    expect(result).toBeNull();
    expect(context.logger.warn).toHaveBeenCalled();
    expect(readFileSync(summaryFile, "utf8")).toContain("semantic-release skip detected");
  });

  it("empty range → null, silent", async () => {
    const plugin = await import("../../scripts/release-skip-guard.mjs");
    const context = makeContext([]);

    const result = await plugin.analyzeCommits(PLUGIN_CONFIG, context);

    expect(result).toBeNull();
    expect(context.logger.warn).not.toHaveBeenCalled();
    expect(readFileSync(summaryFile, "utf8")).toBe("");
  });
});
