import { describe, it, expect } from "vitest";
import { toADF } from "../../src/client/adf.js";

describe("toADF", () => {
  it("wraps plain text in ADF document format", () => {
    const result = toADF("Hello world");
    expect(result).toEqual({
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });
  });

  it("handles empty string", () => {
    const result = toADF("");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].content[0]).toEqual({ type: "text", text: "" });
  });

  it("preserves special characters", () => {
    const result = toADF("Line1\nLine2 & <html>");
    expect(result.content[0].content[0].text).toBe("Line1\nLine2 & <html>");
  });
});
