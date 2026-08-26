import type { AuthConfig, Secrets, TokenCache } from "./types.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

let cache: TokenCache | null = null;

function env(name: string): string | undefined {
  return process.env[name];
}

async function fetchFromRegistry(): Promise<TokenCache> {
  const registryUrl = env("REGISTRY_URL");
  const instanceId = env("INSTANCE_ID");
  const gatewayPsk = env("GATEWAY_PSK");

  if (!registryUrl || !instanceId || !gatewayPsk) {
    throw new Error(
      "Registry mode requires REGISTRY_URL, INSTANCE_ID, and GATEWAY_PSK",
    );
  }

  const url = `${registryUrl}/instances/${instanceId}/secrets`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${gatewayPsk}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Registry fetch failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as Secrets;

  return {
    token: data.oauth.access_token,
    cloudId: data.oauth.cloud_id,
    expiresAt: data.oauth.expires_at,
  };
}

function resolveBasicAuth(): AuthConfig | null {
  const email = env("ATLASSIAN_EMAIL");
  const apiToken = env("ATLASSIAN_API_TOKEN");
  const cloudId = env("ATLASSIAN_CLOUD_ID");
  if (!email || !apiToken || !cloudId) return null;

  return { mode: "basic", email, apiToken, cloudId };
}

function resolveOAuth(): AuthConfig | null {
  const token = env("ATLASSIAN_ACCESS_TOKEN");
  const cloudId = env("ATLASSIAN_CLOUD_ID");
  if (!token || !cloudId) return null;

  return { mode: "oauth2", token, cloudId };
}

function isExpired(c: TokenCache): boolean {
  return Date.now() >= c.expiresAt - REFRESH_BUFFER_MS;
}

async function loadTokenCache(): Promise<TokenCache> {
  const basicAuth = resolveBasicAuth();
  if (basicAuth && basicAuth.mode === "basic") {
    return { token: basicAuth.apiToken, cloudId: basicAuth.cloudId, expiresAt: Number.MAX_SAFE_INTEGER };
  }

  const oauth = resolveOAuth();
  if (oauth && oauth.mode === "oauth2") {
    return { token: oauth.token, cloudId: oauth.cloudId, expiresAt: Number.MAX_SAFE_INTEGER };
  }

  return fetchFromRegistry();
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const basicAuth = resolveBasicAuth();
  if (basicAuth) return basicAuth;

  const oauth = resolveOAuth();
  if (oauth) return oauth;

  const cached = await loadTokenCache();
  return { mode: "registry", token: cached.token, cloudId: cached.cloudId, expiresAt: cached.expiresAt };
}

export async function getToken(): Promise<string> {
  if (!cache || isExpired(cache)) {
    cache = await loadTokenCache();
  }
  return cache.token;
}

export async function getCloudId(): Promise<string> {
  if (!cache || isExpired(cache)) {
    cache = await loadTokenCache();
  }
  return cache.cloudId;
}
