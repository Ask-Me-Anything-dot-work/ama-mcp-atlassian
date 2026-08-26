import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";
import { toADF } from "../client/adf.js";

type CreateInput = {
  projectKey: string;
  summary: string;
  issueType: string;
  description?: string;
  assigneeAccountId?: string;
  priority?: string;
  labels?: string[];
  parentKey?: string;
};

function buildCreateFields(input: CreateInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    project: { key: input.projectKey },
    summary: input.summary,
    issuetype: { name: input.issueType },
  };
  if (input.description) fields.description = toADF(input.description);
  if (input.assigneeAccountId) fields.assignee = { id: input.assigneeAccountId };
  if (input.priority) fields.priority = { name: input.priority };
  if (input.labels) fields.labels = input.labels;
  if (input.parentKey) fields.parent = { key: input.parentKey };
  return fields;
}

export function registerJiraCreateTools(server: McpServer): void {
  server.tool(
    "jira_create_issue",
    "Create a new Jira issue in the specified project.",
    {
      projectKey: z.string().describe("Project key (e.g. PROJ)"),
      summary: z.string().describe("Issue title/summary"),
      issueType: z.string().describe("Issue type name, e.g. Task, Bug, Story"),
      description: z.string().optional().describe("Issue body text (plain text, auto-converted to ADF)"),
      assigneeAccountId: z.string().optional().describe("Atlassian account ID of assignee"),
      priority: z.string().optional().describe("Priority name: Highest, High, Medium, Low, Lowest"),
      labels: z.array(z.string()).optional().describe("Array of label strings"),
      parentKey: z.string().optional().describe("Parent issue key (for subtasks)"),
    },
    async (input) => {
      const client = await createJiraClient();
      const created = await client.issues.createIssue({ fields: buildCreateFields(input) });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(created, null, 2) }],
      };
    },
  );
}
