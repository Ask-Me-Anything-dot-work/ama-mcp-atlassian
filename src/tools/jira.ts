import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";

// eslint-disable-next-line max-lines-per-function -- Tool registration grows in #2, #3
export function registerJiraTools(server: McpServer): void {
  server.tool(
    "jira_get_issue",
    "Get a Jira issue by key",
    { issueKey: z.string().describe("Issue key, e.g. PROJ-123") },
    async ({ issueKey }) => {
      const client = await createJiraClient();
      const issue = await client.issues.getIssue({ issueIdOrKey: issueKey });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.tool(
    "jira_search",
    "Search Jira issues using JQL",
    { jql: z.string().describe("JQL query string"), maxResults: z.number().optional().describe("Max results (default 50)") },
    async ({ jql, maxResults }) => {
      const client = await createJiraClient();
      const results = await client.issueSearch.searchAndReconsileIssuesUsingJql({
        jql,
        maxResults: maxResults ?? 50,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  server.tool(
    "jira_create_issue",
    "Create a new Jira issue",
    {
      projectKey: z.string().describe("Project key"),
      summary: z.string().describe("Issue summary"),
      issueType: z.string().describe("Issue type name"),
      description: z.string().optional().describe("Issue description (ADF or plain text)"),
    },
    async ({ projectKey, summary, issueType, description }) => {
      const client = await createJiraClient();
      const created = await client.issues.createIssue({
        fields: {
          project: { key: projectKey },
          summary,
          issuetype: { name: issueType },
          ...(description ? { description } : {}),
        },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(created, null, 2) }],
      };
    },
  );

  server.tool(
    "jira_update_issue",
    "Update an existing Jira issue",
    {
      issueKey: z.string().describe("Issue key"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ issueKey, fields }) => {
      const client = await createJiraClient();
      await client.issues.editIssue({ issueIdOrKey: issueKey, fields } as never);
      return {
        content: [{ type: "text" as const, text: `Updated ${issueKey}` }],
      };
    },
  );

  server.tool(
    "jira_add_comment",
    "Add a comment to a Jira issue",
    {
      issueKey: z.string().describe("Issue key"),
      body: z.string().describe("Comment body (ADF or plain text)"),
    },
    async ({ issueKey, body }) => {
      const client = await createJiraClient();
      const comment = await client.issueComments.addComment({
        issueIdOrKey: issueKey,
        body,
      } as never);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(comment, null, 2) }],
      };
    },
  );

  server.tool(
    "jira_get_transitions",
    "Get available transitions for a Jira issue",
    { issueKey: z.string().describe("Issue key") },
    async ({ issueKey }) => {
      const client = await createJiraClient();
      const transitions = await client.issues.getTransitions({
        issueIdOrKey: issueKey,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(transitions, null, 2) }],
      };
    },
  );

  server.tool(
    "jira_do_transition",
    "Transition a Jira issue to a new status",
    {
      issueKey: z.string().describe("Issue key"),
      transitionId: z.string().describe("Transition ID from get_transitions"),
    },
    async ({ issueKey, transitionId }) => {
      const client = await createJiraClient();
      await client.issues.doTransition({
        issueIdOrKey: issueKey,
        transition: { id: transitionId },
      } as never);
      return {
        content: [{ type: "text" as const, text: `Transitioned ${issueKey}` }],
      };
    },
  );
}
