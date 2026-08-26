import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/client/atlassian.js", () => ({
  createJiraClient: vi.fn(),
}));

import { registerJiraCreateTools } from "../../src/tools/jira-create.js";
import { registerJiraUpdateTools } from "../../src/tools/jira-update.js";
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

function mockClient() {
  const c = {
    issues: {
      createIssue: vi.fn().mockResolvedValue({ key: "T-1" }),
      editIssue: vi.fn().mockResolvedValue(undefined),
    },
  };
  (createJiraClient as ReturnType<typeof vi.fn>).mockResolvedValue(c);
  return c;
}

describe("jira_create_issue", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraCreateTools(server as never); });

  it("creates with required fields", async () => {
    const client = mockClient();
    const h = server.handlers.jira_create_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ projectKey: "T", summary: "Bug", issueType: "Bug" });
    expect(client.issues.createIssue).toHaveBeenCalledWith({
      fields: { project: { key: "T" }, summary: "Bug", issuetype: { name: "Bug" } },
    });
  });

  it("converts description to ADF", async () => {
    const client = mockClient();
    const h = server.handlers.jira_create_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ projectKey: "T", summary: "X", issueType: "Task", description: "Hello" });
    const args = (client.issues.createIssue as ReturnType<typeof vi.fn>).mock.calls[0] as [{ fields: { description: { type: string } } }];
    expect(args[0].fields.description).toEqual({
      type: "doc", version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    });
  });

  it("passes optional fields", async () => {
    const client = mockClient();
    const h = server.handlers.jira_create_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({
      projectKey: "T", summary: "X", issueType: "Task",
      assigneeAccountId: "a-1", priority: "High", labels: ["u"], parentKey: "T-1",
    });
    const args = (client.issues.createIssue as ReturnType<typeof vi.fn>).mock.calls[0] as [{ fields: Record<string, unknown> }];
    const f = args[0].fields;
    expect(f.assignee).toEqual({ id: "a-1" });
    expect(f.priority).toEqual({ name: "High" });
    expect(f.labels).toEqual(["u"]);
    expect(f.parent).toEqual({ key: "T-1" });
  });
});

describe("jira_update_issue", () => {
  let server: ReturnType<typeof createMockServer>;
  beforeEach(() => { vi.clearAllMocks(); server = createMockServer(); registerJiraUpdateTools(server as never); });

  it("updates fields", async () => {
    const client = mockClient();
    const h = server.handlers.jira_update_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-1", summary: "Upd" });
    expect(client.issues.editIssue).toHaveBeenCalledWith({
      issueIdOrKey: "T-1", fields: { summary: "Upd" },
    });
  });

  it("converts description to ADF", async () => {
    const client = mockClient();
    const h = server.handlers.jira_update_issue as (i: Record<string, unknown>) => Promise<unknown>;
    await h({ issueKey: "T-1", description: "New" });
    const args = (client.issues.editIssue as ReturnType<typeof vi.fn>).mock.calls[0] as [{ fields: { description: { type: string } } }];
    expect(args[0].fields.description.type).toBe("doc");
  });
});
