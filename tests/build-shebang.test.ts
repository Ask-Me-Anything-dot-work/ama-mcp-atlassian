import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("shebang preservation", () => {
  it("src/index.ts starts with node shebang", () => {
    const src = readFileSync(join(import.meta.dirname, "../src/index.ts"), "utf8");
    expect(src.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});
