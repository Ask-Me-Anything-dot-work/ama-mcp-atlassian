import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/client/atlassian.js", () => ({
  createJiraClient: vi.fn(),
}));

import { registerJiraTransitionTools } from "../../src/tools/jira-transition.js";
import { registerJiraCommentTools } from "../../src/tools/jira-comment.js";
import { registerJiraProjectTools } from "../../src/tools/jira-projects.js";
import { createJiraClient } from "../../src/client/atlassian.js";

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

function mockClient(overrides: Record<string, unknown> = {}) {
  const c = {
    issues: {
      getTransitions: vi.fn().mockResolvedValue({ transitions: [{ id: "31", name: "In Progress" }] }),
      doTransition: vi.fn().mockResolvedValue(undefined),
    },
    issueComments: { addComment: vi.fn().mockResolvedValue({ id: "1" }) },
    projects: { searchProjects: vi.fn().mockResolvedValue({ values: [], total: 0 }) },
    ...overrides,
  };
  (createJiraClient as ReturnType<typeof vi.fn>).mockResolvedValue(c);
  return c;
}

describe("jira_transition_issue", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraTransitionTools(server as never); });

  it("transitions by name", async () => {
    const client = mockClient();
    const h = server.handlers.jira_transition_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-1", transitionName: "In Progress" });
    expect(client.issues.getTransitions).toHaveBeenCalledWith({ issueIdOrKey: "T-1" });
    expect(client.issues.doTransition).toHaveBeenCalledWith({
      issueIdOrKey: "T-1", transition: { id: "31" },
    });
  });

  it("matches case-insensitively", async () => {
    const client = mockClient();
    const h = server.handlers.jira_transition_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-1", transitionName: "in progress" });
    expect(client.issues.doTransition).toHaveBeenCalled();
  });

  it("returns error for unknown transition", async () => {
    mockClient();
    const h = server.handlers.jira_transition_issue as (i: Record<string, unknown>) => Promise<unknown>;
    const r = (await h({ issueKey: "T-1", transitionName: "Bogus" })) as { content: [{ text: string }] };
    const p = JSON.parse(r.content[0].text) as { error: string };
    expect(p.error).toContain("No transition named");
  });
});

describe("jira_add_comment", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraCommentTools(server as never); });

  it("adds comment with ADF body", async () => {
    const client = mockClient();
    const h = server.handlers.jira_add_comment as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-1", body: "Nice" });
    const args = (client.issueComments.addComment as ReturnType<typeof vi.fn>).mock.calls[0] as [{ issueIdOrKey: string; body: { type: string } }];
    expect(args[0].issueIdOrKey).toBe("T-1");
    expect(args[0].body.type).toBe("doc");
  });
});

describe("jira_get_projects", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraProjectTools(server as never); });

  it("returns projects", async () => {
    const client = mockClient();
    const h = server.handlers.jira_get_projects as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ maxResults: 10 });
    expect(client.projects.searchProjects).toHaveBeenCalledWith({ maxResults: 10, query: undefined });
  });

  it("passes query", async () => {
    const client = mockClient();
    const h = server.handlers.jira_get_projects as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ maxResults: 50, query: "my" });
    expect(client.projects.searchProjects).toHaveBeenCalledWith({ maxResults: 50, query: "my" });
  });
});
