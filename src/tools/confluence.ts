import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceClient } from "../client/atlassian.js";

// eslint-disable-next-line max-lines-per-function -- Tool registration grows in #2, #3
export function registerConfluenceTools(server: McpServer): void {
  server.tool(
    "confluence_get_page",
    "Get a Confluence page by ID",
    { pageId: z.number().describe("Page ID (numeric)"), version: z.number().optional().describe("Specific version number") },
    async ({ pageId, version }) => {
      const client = await createConfluenceClient();
      const page = await client.page.getPageById({ id: pageId, version });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );

  server.tool(
    "confluence_create_page",
    "Create a new Confluence page",
    {
      spaceId: z.string().describe("Space ID"),
      title: z.string().describe("Page title"),
      body: z.string().describe("Page body content (storage format)"),
      parentProductId: z.string().optional().describe("Parent page ID"),
    },
    async ({ spaceId, title, body, parentProductId }) => {
      const client = await createConfluenceClient();
      const params = {
        body: {
          storage: { value: body, representation: "storage" },
          spaceId,
          title,
          parentId: parentProductId ?? null,
        },
      };
      const page = await client.page.createPage(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );

  server.tool(
    "confluence_update_page",
    "Update an existing Confluence page",
    {
      pageId: z.number().describe("Page ID (numeric)"),
      title: z.string().optional().describe("New title"),
      body: z.string().optional().describe("New body content (storage format)"),
      version: z.number().describe("Current version number (for optimistic locking)"),
    },
    async ({ pageId, title, body, version }) => {
      const client = await createConfluenceClient();
      const params = {
        id: pageId,
        version: { number: version, message: "Updated via MCP" },
        ...(title ? { title } : {}),
        ...(body ? { body: { storage: { value: body, representation: "storage" } } } : {}),
      };
      const page = await client.page.updatePage(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );

  server.tool(
    "confluence_search",
    "Search Confluence pages by title or space",
    {
      spaceId: z.array(z.number()).optional().describe("Filter by space IDs"),
      title: z.string().optional().describe("Filter by title (partial match)"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
    async ({ spaceId, title, limit }) => {
      const client = await createConfluenceClient();
      const results = await client.page.getPages({
        ...(spaceId ? { spaceId } : {}),
        ...(title ? { title } : {}),
        limit: limit ?? 25,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  server.tool(
    "confluence_get_space",
    "Get a Confluence space by ID",
    { spaceId: z.number().describe("Space ID (numeric)") },
    async ({ spaceId }) => {
      const client = await createConfluenceClient();
      const space = await client.space.getSpaceById({ id: spaceId });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(space, null, 2) }],
      };
    },
  );

  server.tool(
    "confluence_add_comment",
    "Add a comment to a Confluence page",
    {
      pageId: z.string().describe("Page ID"),
      body: z.string().describe("Comment body (storage format)"),
    },
    async ({ pageId, body }) => {
      const client = await createConfluenceClient();
      const params = {
        pageId,
        body: { storage: { value: body, representation: "storage" } },
      } as Record<string, unknown>;
      const comment = await client.comment.createFooterComment(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(comment, null, 2) }],
      };
    },
  );
}
