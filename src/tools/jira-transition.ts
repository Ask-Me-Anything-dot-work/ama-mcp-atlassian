import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";

type TextContent = { type: "text"; text: string };

function textResponse(data: unknown): { content: TextContent[] } {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function handleTransition(
  issueKey: string,
  transitionName: string,
): Promise<{ content: TextContent[] }> {
  const client = await createJiraClient();
  const { transitions } = await client.issues.getTransitions({ issueIdOrKey: issueKey });
  if (!transitions || transitions.length === 0) {
    return textResponse({ error: "No transitions available for this issue" });
  }
  const match = transitions.find(
    (t) => t.name?.toLowerCase() === transitionName.toLowerCase(),
  );
  if (!match) {
    return textResponse({
      error: `No transition named "${transitionName}" found`,
      available: transitions.map((t) => t.name),
    });
  }
  await client.issues.doTransition({
    issueIdOrKey: issueKey,
    transition: { id: match.id },
  } as never);
  return textResponse({ success: true, transitionedTo: transitionName });
}

export function registerJiraTransitionTools(server: McpServer): void {
  server.tool(
    "jira_transition_issue",
    "Move a Jira issue to a new status by triggering a workflow transition (e.g. In Progress, Done).",
    {
      issueKey: z.string().describe("Issue key"),
      transitionName: z.string().describe('Target status name, e.g. "In Progress", "Done", "Closed"'),
    },
    ({ issueKey, transitionName }) => handleTransition(issueKey, transitionName),
  );
}
