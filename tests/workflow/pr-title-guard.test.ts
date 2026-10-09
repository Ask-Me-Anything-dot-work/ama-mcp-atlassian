import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "../..");
const WORKFLOW = parse(readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8"));
const PR_TITLE_JOB = WORKFLOW.jobs["pr-title"];
const REQUIRED_TYPES = ["opened", "edited", "synchronize", "reopened"];

type Step = { name?: string; uses?: string; run?: string; env?: Record<string, string> };
const steps: Step[] = PR_TITLE_JOB.steps;
const stepIndex = (pred: (s: Step) => boolean): number => steps.findIndex(pred);

function lintTitle(subject: string): number {
  try {
    execSync(`printf '%s\\n' "${subject}" | bunx commitlint --config commitlint.config.ts`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    return 0;
  } catch (error) {
    const status = (error as { status?: number }).status;
    return typeof status === "number" ? status : 1;
  }
}

describe("pr-title guard — workflow contract", () => {
  it("defines a pr-title job", () => {
    expect(PR_TITLE_JOB).toBeDefined();
    expect(PR_TITLE_JOB.name).toBe("PR Title (conventional)");
    expect(PR_TITLE_JOB["runs-on"]).toBe("ubuntu-latest");
  });

  it("is gated to pull_request events (skipped, not failed, on push to main)", () => {
    expect(PR_TITLE_JOB.if).toBe("github.event_name == 'pull_request'");
    expect(WORKFLOW.on.push.branches).toContain("main");
    expect(WORKFLOW.jobs["lint-and-test"]).toBeDefined();
  });

  it("fires on opened / edited / synchronize / reopened", () => {
    const types: string[] = WORKFLOW.on.pull_request.types;
    for (const type of REQUIRED_TYPES) expect(types).toContain(type);
  });

  it("checks out before installing and lints the PR title after install", () => {
    const checkout = stepIndex((s) => Boolean(s.uses?.startsWith("actions/checkout")));
    const install = stepIndex((s) => s.run === "bun install --frozen-lockfile");
    const lint = stepIndex((s) => Boolean(s.run?.includes("bunx commitlint")));
    expect(checkout).toBeGreaterThanOrEqual(0);
    expect(install).toBeGreaterThan(checkout);
    expect(lint).toBeGreaterThan(install);
    expect(steps[lint].run).toMatch(/printf '%s\\n' "\$PR_TITLE" \| bunx commitlint/);
    expect(steps[lint].run).toContain("--config commitlint.config.ts");
    expect(steps[lint].env).toEqual({ PR_TITLE: "${{ github.event.pull_request.title }}" });
  });
});

describe("pr-title guard — commitlint behaviour", () => {
  it("accepts a conventional subject", () => {
    expect(lintTitle("fix: x")).toBe(0);
  });

  it("rejects the squash subject class that skipped semantic-release (run 37902172888)", () => {
    expect(lintTitle("Fix #18: x")).not.toBe(0);
  });

  it("rejects non-conventional Ref subjects", () => {
    expect(lintTitle("Ref #21: x")).not.toBe(0);
  });
});
