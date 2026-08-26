import type { Secrets, TokenCache } from "./types.js";

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

function resolveStandalone(): TokenCache | null {
  const token = env("ATLASSIAN_ACCESS_TOKEN");
  const cloudId = env("ATLASSIAN_CLOUD_ID");
  if (!token || !cloudId) return null;

  return {
    token,
    cloudId,
    expiresAt: Number.MAX_SAFE_INTEGER,
  };
}

function isExpired(c: TokenCache): boolean {
  return Date.now() >= c.expiresAt - REFRESH_BUFFER_MS;
}

async function load(): Promise<TokenCache> {
  const standalone = resolveStandalone();
  if (standalone) return standalone;
  return fetchFromRegistry();
}

export async function getToken(): Promise<string> {
  if (!cache || isExpired(cache)) {
    cache = await load();
  }
  return cache.token;
}

export async function getCloudId(): Promise<string> {
  if (!cache || isExpired(cache)) {
    cache = await load();
  }
  return cache.cloudId;
}
