import { createCloudClient } from "jira.js";
import { createV2Client } from "confluence.js";
import { getToken, getCloudId } from "../config.js";
import type { Auth } from "jira.js";

export async function createJiraClient() {
  const [token, cloudId] = await Promise.all([getToken(), getCloudId()]);
  return createCloudClient({
    host: "https://api.atlassian.com",
    auth: { type: "oauth2", accessToken: token, cloudId },
    getAuthOn401: async (): Promise<Auth> => {
      const fresh = await getToken();
      return { type: "oauth2", accessToken: fresh, cloudId };
    },
  });
}

export async function createConfluenceClient() {
  const [token, cloudId] = await Promise.all([getToken(), getCloudId()]);
  return createV2Client({
    host: "https://api.atlassian.com",
    auth: { type: "oauth2", accessToken: token, cloudId },
  });
}
