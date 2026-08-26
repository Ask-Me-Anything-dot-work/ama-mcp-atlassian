import { beforeEach, afterEach, vi } from "vitest";

const envBackup = { ...process.env };

export function setupConfigTest(): void {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...envBackup };
    delete process.env.ATLASSIAN_EMAIL;
    delete process.env.ATLASSIAN_API_TOKEN;
    delete process.env.ATLASSIAN_ACCESS_TOKEN;
    delete process.env.ATLASSIAN_CLOUD_ID;
    delete process.env.REGISTRY_URL;
    delete process.env.INSTANCE_ID;
    delete process.env.GATEWAY_PSK;
  });

  afterEach(() => {
    process.env = envBackup;
  });
}
