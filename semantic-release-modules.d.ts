declare module "@semantic-release/commit-analyzer" {
  export function analyzeCommits(
    pluginConfig: Record<string, unknown>,
    context: {
      commits?: ReadonlyArray<{ message: string }>;
      cwd?: string;
      logger: { log: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
      [key: string]: unknown;
    },
  ): Promise<string | null>;
}
