interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
}

interface AdfDoc {
  version: number;
  type: "doc";
  content: AdfNode[];
}

function parseInline(text: string): AdfNode[] {
  const nodes: AdfNode[] = [];
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push({ type: "text", text: text.slice(last, m.index) });
    }
    nodes.push(parseInlineMatch(m));
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push({ type: "text", text: text.slice(last) });
  }
  return nodes.length ? nodes : [{ type: "text", text }];
}

function parseInlineMatch(m: RegExpExecArray): AdfNode {
  if (m[2]) return { type: "text", text: m[2], marks: [{ type: "strong" }, { type: "em" }] };
  if (m[3]) return { type: "text", text: m[3], marks: [{ type: "strong" }] };
  if (m[4]) return { type: "text", text: m[4], marks: [{ type: "em" }] };
  return { type: "text", text: m[5], marks: [{ type: "code" }] };
}

function parseCodeBlock(lines: string[], start: number): { node: AdfNode; next: number } {
  const lang = lines[start].slice(3).trim();
  const codeLines: string[] = [];
  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith("```")) {
    codeLines.push(lines[i]);
    i++;
  }
  const node: AdfNode = { type: "codeBlock", content: [{ type: "text", text: codeLines.join("\n") }] };
  if (lang) node.attrs = { language: lang };
  return { node, next: i + 1 };
}

function parseBulletList(lines: string[], start: number): { node: AdfNode; next: number } {
  const items: AdfNode[] = [];
  let i = start;
  while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
    const itemText = lines[i].replace(/^[-*]\s+/, "");
    items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(itemText) }] });
    i++;
  }
  return { node: { type: "bulletList", content: items }, next: i };
}

export function toADF(markdown: string): AdfDoc {
  const lines = markdown.split("\n");
  const content: AdfNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const result = parseCodeBlock(lines, i);
      content.push(result.node);
      i = result.next;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    if (line.match(/^[-*]\s+/)) {
      const result = parseBulletList(lines, i);
      content.push(result.node);
      i = result.next;
      continue;
    }

    if (line.trim() !== "") {
      content.push({ type: "paragraph", content: parseInline(line) });
    }
    i++;
  }

  return { version: 1, type: "doc", content };
}

function renderMarks(text: string, marks?: Array<{ type: string }>): string {
  if (!marks?.length) return text;
  let result = text;
  for (const mark of marks) {
    if (mark.type === "strong") result = `**${result}**`;
    else if (mark.type === "em") result = `*${result}*`;
    else if (mark.type === "code") result = `\`${result}\``;
  }
  return result;
}

function renderTextNode(node: AdfNode): string {
  return renderMarks(node.text ?? "", node.marks);
}

function renderCodeBlock(node: AdfNode): string {
  const lang = (node.attrs?.language as string) ?? "";
  const code = (node.content ?? []).map(renderNode).join("");
  return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
}

function renderHeading(node: AdfNode): string {
  const level = (node.attrs?.level as number) ?? 1;
  return `${"#".repeat(level)} ${(node.content ?? []).map(renderNode).join("")}\n`;
}

function renderListItem(node: AdfNode): string {
  return (node.content ?? []).map(renderNode).join("");
}

function renderNode(node: AdfNode): string {
  switch (node.type) {
    case "text":
      return renderTextNode(node);
    case "paragraph":
      return (node.content ?? []).map(renderNode).join("") + "\n";
    case "heading":
      return renderHeading(node);
    case "bulletList":
      return (node.content ?? []).map((item) => `- ${renderNode(item)}`).join("");
    case "listItem":
      return renderListItem(node);
    case "codeBlock":
      return renderCodeBlock(node);
    default:
      return (node.content ?? []).map(renderNode).join("");
  }
}

export function fromADF(doc: AdfDoc | AdfNode): string {
  if (doc.type === "doc") {
    return (doc.content ?? []).map(renderNode).join("");
  }
  return renderNode(doc);
}
