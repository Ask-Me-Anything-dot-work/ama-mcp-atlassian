import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/client/atlassian.js", () => ({
  createJiraClient: vi.fn(),
}));

import { registerJiraSearchTools } from "../../src/tools/jira-search.js";
import { registerJiraGetTools } from "../../src/tools/jira-get.js";
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
    issueSearch: { searchAndReconsileIssuesUsingJql: vi.fn().mockResolvedValue({ issues: [], total: 0 }) },
    issues: { getIssue: vi.fn().mockResolvedValue({ key: "T-1", fields: {} }) },
    ...overrides,
  };
  (createJiraClient as ReturnType<typeof vi.fn>).mockResolvedValue(c);
  return c;
}

describe("jira_search_issues", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraSearchTools(server as never); });

  it("calls with correct params", async () => {
    const client = mockClient();
    const h = server.handlers.jira_search_issues as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ jql: "project = T", maxResults: 10 });
    expect(client.issueSearch.searchAndReconsileIssuesUsingJql).toHaveBeenCalledWith({
      jql: "project = T", maxResults: 10,
      fields: ["summary", "status", "assignee", "priority", "issuetype", "created", "updated"],
    });
  });

  it("accepts custom fields", async () => {
    const client = mockClient();
    const h = server.handlers.jira_search_issues as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ jql: "project = T", maxResults: 5, fields: ["summary"] });
    expect(client.issueSearch.searchAndReconsileIssuesUsingJql).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ["summary"] }),
    );
  });
});

describe("jira_get_issue", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraGetTools(server as never); });

  it("fetches by key", async () => {
    const client = mockClient();
    const h = server.handlers.jira_get_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-42" });
    expect(client.issues.getIssue).toHaveBeenCalledWith({ issueIdOrKey: "T-42", fields: undefined });
  });

  it("passes fields", async () => {
    const client = mockClient();
    const h = server.handlers.jira_get_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-42", fields: ["summary"] });
    expect(client.issues.getIssue).toHaveBeenCalledWith({ issueIdOrKey: "T-42", fields: ["summary"] });
  });
});
