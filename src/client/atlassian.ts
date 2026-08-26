import { createCloudClient } from "jira.js";
import type { Auth } from "jira.js";
import { createV1Client, createV2Client } from "confluence.js";
import { getAuthConfig } from "../config.js";
import type { AuthConfig } from "../types.js";

function getHost(authConfig: AuthConfig): string {
  if (authConfig.mode === "basic") {
    return `https://${authConfig.cloudId}.atlassian.net`;
  }
  return "https://api.atlassian.com";
}

export async function createJiraClient() {
  const authConfig = await getAuthConfig();
  const host = getHost(authConfig);

  if (authConfig.mode === "basic") {
    return createCloudClient({
      host,
      auth: { type: "basic", email: authConfig.email, apiToken: authConfig.apiToken },
    });
  }

  const token = authConfig.mode === "registry" ? authConfig.token : authConfig.token;
  return createCloudClient({
    host,
    auth: { type: "oauth2", accessToken: token, cloudId: authConfig.cloudId },
    getAuthOn401: async (): Promise<Auth> => {
      const fresh = await getAuthConfig();
      if (fresh.mode === "basic") {
        return { type: "basic", email: fresh.email, apiToken: fresh.apiToken };
      }
      return { type: "oauth2", accessToken: fresh.token, cloudId: fresh.cloudId };
    },
  });
}

export async function createConfluenceClient() {
  const authConfig = await getAuthConfig();
  const host = getHost(authConfig);

  if (authConfig.mode === "basic") {
    return createV2Client({
      host,
      auth: { type: "basic", email: authConfig.email, apiToken: authConfig.apiToken },
    });
  }

  const token = authConfig.mode === "registry" ? authConfig.token : authConfig.token;
  return createV2Client({
    host,
    auth: { type: "oauth2", accessToken: token, cloudId: authConfig.cloudId },
  });
}

export async function createConfluenceV1Client() {
  const authConfig = await getAuthConfig();
  const host = getHost(authConfig);

  if (authConfig.mode === "basic") {
    return createV1Client({
      host,
      auth: { type: "basic", email: authConfig.email, apiToken: authConfig.apiToken },
    });
  }

  const token = authConfig.mode === "registry" ? authConfig.token : authConfig.token;
  return createV1Client({
    host,
    auth: { type: "oauth2", accessToken: token, cloudId: authConfig.cloudId },
  });
}
