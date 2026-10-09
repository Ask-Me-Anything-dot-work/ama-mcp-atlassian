import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/client/atlassian.js", () => ({
  createConfluenceClient: vi.fn(),
  createConfluenceV1Client: vi.fn(),
}));

vi.mock("../../src/client/adf.js", () => ({
  toADF: vi.fn((md: string) => ({ version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: md }] }] })),
  fromADF: vi.fn((doc: { content?: Array<{ content?: Array<{ text?: string }> }> }) => {
    const text = doc.content?.[0]?.content?.[0]?.text ?? "";
    return text;
  }),
}));

import { registerConfluenceSearchTools } from "../../src/tools/confluence-search.js";
import { registerConfluenceGetTools } from "../../src/tools/confluence-get.js";
import { registerConfluenceCreateTools } from "../../src/tools/confluence-create.js";
import { registerConfluenceUpdateTools } from "../../src/tools/confluence-update.js";
import { registerConfluenceCommentTools } from "../../src/tools/confluence-comment.js";
import { registerConfluenceSpaceTools } from "../../src/tools/confluence-spaces.js";
import { createConfluenceClient, createConfluenceV1Client } from "../../src/client/atlassian.js";

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

function mockV1Client(overrides: Record<string, unknown> = {}) {
  const c = {
    search: { searchByCQL: vi.fn().mockResolvedValue({ results: [], totalSize: 0 }) },
    ...overrides,
  };
  (createConfluenceV1Client as ReturnType<typeof vi.fn>).mockResolvedValue(c);
  return c;
}

function mockV2Client(overrides: Record<string, unknown> = {}) {
  const c = {
    page: {
      getPageById: vi.fn().mockResolvedValue({ id: 1, title: "T", spaceId: "S", body: { atlas_doc_format: { value: '{"type":"doc","content":[]}' } }, version: { number: 1, createdAt: "2026-01-01" } }),
      createPage: vi.fn().mockResolvedValue({ id: 2, title: "New" }),
      updatePage: vi.fn().mockResolvedValue({ id: 1, title: "Updated" }),
    },
    comment: {
      createFooterComment: vi.fn().mockResolvedValue({ id: "c1", body: {} }),
    },
    space: {
      getSpaces: vi.fn().mockResolvedValue({ results: [], size: 0 }),
    },
    ...overrides,
  };
  (createConfluenceClient as ReturnType<typeof vi.fn>).mockResolvedValue(c);
  return c;
}

describe("confluence_search", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerConfluenceSearchTools(server as never); });

  it("calls searchByCQL with correct params", async () => {
    const client = mockV1Client();
    const h = server.handlers.confluence_search as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ cql: 'space = "ENG"', limit: 5 });
    expect(client.search.searchByCQL).toHaveBeenCalledWith({ cql: 'space = "ENG"', limit: 5 });
  });

  it("uses default limit", async () => {
    const client = mockV1Client();
    const h = server.handlers.confluence_search as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ cql: "type = page", limit: 10 });
    expect(client.search.searchByCQL).toHaveBeenCalledWith({ cql: "type = page", limit: 10 });
  });
});

describe("confluence_get_page", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerConfluenceGetTools(server as never); });

  it("fetches page with body-format", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_get_page as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ pageId: "42" });
    expect(client.page.getPageById).toHaveBeenCalledWith({
      id: 42,
      bodyFormat: "atlas_doc_format",
      includeVersion: true,
    });
  });
});

describe("confluence_create_page", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerConfluenceCreateTools(server as never); });

  it("creates page with nested body payload and stringified ADF value", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_create_page as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ spaceId: "100", title: "Test", body: "Hello" });
    expect(client.page.createPage).toHaveBeenCalledWith({
      body: {
        spaceId: "100",
        title: "Test",
        status: "current",
        body: {
          representation: "atlas_doc_format",
          value: JSON.stringify({
            version: 1,
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
          }),
        },
      },
    });
    const arg = (client.page.createPage as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      body: { parentId?: string; body: { value: string } };
    };
    expect(arg.body.parentId).toBeUndefined();
    expect(JSON.parse(arg.body.body.value)).toEqual({
      version: 1,
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    });
  });

  it("nests parentId inside body when provided and omits it when not", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_create_page as (i: Record<string, unknown>) => Promise<unknown>;

    await h({ spaceId: "100", title: "Child", body: "content", parentId: "50" });
    let arg = (client.page.createPage as ReturnType<typeof vi.fn>).mock.calls[0][0] as { body: Record<string, unknown> };
    expect(arg.body).toEqual(expect.objectContaining({ parentId: "50" }));

    await h({ spaceId: "100", title: "Root", body: "content" });
    arg = (client.page.createPage as ReturnType<typeof vi.fn>).mock.calls[1][0] as { body: Record<string, unknown> };
    expect("parentId" in arg.body).toBe(false);
  });
});

describe("confluence_update_page", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerConfluenceUpdateTools(server as never); });

  it("updates page with incremented version", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_update_page as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ pageId: "42", title: "Updated", body: "new content", versionNumber: 3 });
    expect(client.page.updatePage).toHaveBeenCalledWith({
      id: 42,
      body: {
        id: "42",
        title: "Updated",
        status: "current",
        version: { number: 4 },
        body: {
          representation: "atlas_doc_format",
          value: JSON.stringify({
            version: 1,
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "new content" }] }],
          }),
        },
      },
    });
  });

  it("pins body.id as a string so the API body passes bean validation", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_update_page as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ pageId: "42", title: "Updated", body: "new content", versionNumber: 3 });
    const arg = (client.page.updatePage as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      id: number;
      body: { id?: unknown };
    };
    expect(arg.body.id).toBe("42");
    expect(typeof arg.body.id).toBe("string");
    expect(arg.id).toBe(42);
  });
});

describe("confluence_add_comment", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerConfluenceCommentTools(server as never); });

  it("creates footer comment with ADF body", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_add_comment as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ pageId: "42", body: "Nice page!" });
    expect(client.comment.createFooterComment).toHaveBeenCalledWith({
      pageId: "42",
      body: {
        representation: "atlas_doc_format",
        value: JSON.stringify({
          version: 1,
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Nice page!" }] }],
        }),
      },
    });
    const arg = (client.comment.createFooterComment as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      body: { value: unknown };
    };
    expect(typeof arg.body.value).toBe("string");
  });
});

describe("confluence_get_spaces", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerConfluenceSpaceTools(server as never); });

  it("lists spaces with limit", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_get_spaces as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ limit: 10, type: "global" });
    expect(client.space.getSpaces).toHaveBeenCalledWith({ limit: 10, type: "global" });
  });

  it("uses defaults when no params", async () => {
    const client = mockV2Client();
    const h = server.handlers.confluence_get_spaces as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ limit: 25, type: undefined });
    expect(client.space.getSpaces).toHaveBeenCalledWith({ limit: 25, type: undefined });
  });
});
