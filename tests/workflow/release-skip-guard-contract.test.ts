import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "../..");
const CONFIG = JSON.parse(readFileSync(join(ROOT, ".releaserc.json"), "utf8"));
const RELEASE_WORKFLOW = parse(readFileSync(join(ROOT, ".github/workflows/release.yml"), "utf8"));

const pluginNames = CONFIG.plugins.map((p: unknown) => (Array.isArray(p) ? p[0] : p));

describe("release-skip-guard — .releaserc contract", () => {
  it("replaces @semantic-release/commit-analyzer as the first plugin", () => {
    const first = CONFIG.plugins[0];
    expect(Array.isArray(first)).toBe(true);
    expect(first[0]).toBe("./scripts/release-skip-guard.mjs");
    expect(first[1]).toEqual({
      preset: "conventionalcommits",
      parserOpts: { commentChar: null },
    });
    expect(pluginNames).not.toContain("@semantic-release/commit-analyzer");
  });

  it("keeps the rest of the release pipeline intact", () => {
    expect(pluginNames).toContain("@semantic-release/release-notes-generator");
    expect(pluginNames).toContain("@semantic-release/npm");
    expect(pluginNames).toContain("@semantic-release/git");
    expect(pluginNames).toContain("@semantic-release/github");
  });
});

describe("release-skip-guard — release.yml contract", () => {
  it("passes NTFY_TOKEN to the Release step", () => {
    const steps: { run?: string; env?: Record<string, string> }[] = RELEASE_WORKFLOW.jobs.release.steps;
    const releaseStep = steps.find((s) => s.run === "bun run release");
    expect(releaseStep).toBeDefined();
    expect(releaseStep?.env).toMatchObject({
      GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}",
      NPM_TOKEN: "${{ secrets.NPM_TOKEN }}",
      NTFY_TOKEN: "${{ secrets.NTFY_TOKEN }}",
    });
  });
});
