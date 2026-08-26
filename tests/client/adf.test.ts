import { describe, it, expect } from "vitest";
import { toADF, fromADF } from "../../src/client/adf.js";

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
    expect(result.content).toHaveLength(0);
  });

  it("preserves special characters", () => {
    const result = toADF("Line1\nLine2 & <html>");
    expect(result.content).toHaveLength(2);
  });

  it("skips blank lines", () => {
    const result = toADF("para1\n\n\npara2");
    expect(result.content).toHaveLength(2);
  });
});

describe("toADF headings", () => {
  it("converts h1 and h2", () => {
    const result = toADF("# Title\n## Subtitle");
    expect(result.content).toEqual([
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subtitle" }] },
    ]);
  });
});

describe("toADF lists", () => {
  it("converts bullet lists", () => {
    const result = toADF("- Item 1\n- Item 2");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("bulletList");
    expect(result.content[0].content).toHaveLength(2);
  });
});

describe("toADF code blocks", () => {
  it("converts code blocks with language", () => {
    const result = toADF("```typescript\nconst x = 1;\n```");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("codeBlock");
    expect(result.content[0].attrs).toEqual({ language: "typescript" });
  });
});

describe("toADF inline marks", () => {
  it("converts bold", () => {
    const result = toADF("**bold text**");
    expect(result.content[0].content![0].marks).toEqual([{ type: "strong" }]);
  });

  it("converts italic", () => {
    const result = toADF("*italic text*");
    expect(result.content[0].content![0].marks).toEqual([{ type: "em" }]);
  });

  it("converts inline code", () => {
    const result = toADF("`code`");
    expect(result.content[0].content![0].marks).toEqual([{ type: "code" }]);
  });
});

describe("fromADF", () => {
  it("renders paragraphs", () => {
    const doc = { version: 1, type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] };
    expect(fromADF(doc)).toBe("Hello\n");
  });

  it("renders headings", () => {
    const doc = { version: 1, type: "doc" as const, content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Sub" }] }] };
    expect(fromADF(doc)).toBe("## Sub\n");
  });

  it("renders bullet lists", () => {
    const doc = {
      version: 1, type: "doc" as const,
      content: [{
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }] },
        ],
      }],
    };
    expect(fromADF(doc)).toBe("- A\n- B\n");
  });

  it("renders code blocks", () => {
    const doc = {
      version: 1, type: "doc" as const,
      content: [{ type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const x = 1;" }] }],
    };
    expect(fromADF(doc)).toBe("```ts\nconst x = 1;\n```\n");
  });

  it("renders text marks", () => {
    const doc = {
      version: 1, type: "doc" as const,
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "bold", marks: [{ type: "strong" }] },
          { type: "text", text: " and " },
          { type: "text", text: "italic", marks: [{ type: "em" }] },
          { type: "text", text: " and " },
          { type: "text", text: "code", marks: [{ type: "code" }] },
        ],
      }],
    };
    expect(fromADF(doc)).toBe("**bold** and *italic* and `code`\n");
  });

  it("round-trips simple markdown", () => {
    const md = "# Title\n\nSome text\n\n- Item 1\n- Item 2";
    const adf = toADF(md);
    const back = fromADF(adf);
    expect(back).toContain("# Title");
    expect(back).toContain("Some text");
    expect(back).toContain("- Item 1");
    expect(back).toContain("- Item 2");
  });
});
