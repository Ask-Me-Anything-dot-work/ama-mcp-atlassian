import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";
import { toADF } from "../client/adf.js";

export function registerJiraUpdateTools(server: McpServer): void {
  server.tool(
    "jira_update_issue",
    "Update fields on an existing Jira issue.",
    {
      issueKey: z.string().describe("Issue key (e.g. PROJ-42)"),
      summary: z.string().optional().describe("New summary"),
      description: z
        .string()
        .optional()
        .describe("New description (plain text, auto-converted to ADF)"),
      assigneeAccountId: z
        .string()
        .optional()
        .describe("New assignee's account ID"),
      priority: z.string().optional().describe("New priority name"),
      labels: z
        .array(z.string())
        .optional()
        .describe("Replace labels with this array"),
    },
    async ({ issueKey, summary, description, assigneeAccountId, priority, labels }) => {
      const client = await createJiraClient();
      const fields: Record<string, unknown> = {};
      if (summary) fields.summary = summary;
      if (description) fields.description = toADF(description);
      if (assigneeAccountId) fields.assignee = { id: assigneeAccountId };
      if (priority) fields.priority = { name: priority };
      if (labels) fields.labels = labels;
      await client.issues.editIssue({ issueIdOrKey: issueKey, fields } as never);
      return {
        content: [{ type: "text" as const, text: `Updated ${issueKey}` }],
      };
    },
  );
}
