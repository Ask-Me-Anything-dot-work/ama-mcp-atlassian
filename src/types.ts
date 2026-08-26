export interface Secrets {
  oauth: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    scope: string;
    cloud_id: string;
  };
}

export interface TokenCache {
  token: string;
  cloudId: string;
  expiresAt: number;
}
