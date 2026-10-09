// semantic-release skip guard (ADR-004): wraps @semantic-release/commit-analyzer.
// On the skip path (analyzeCommits -> null with commits in range) surfaces the
// skip loudly: logger.warn + GitHub job summary + ::warning:: annotation + ntfy.
// On the release path behaviour is unchanged (pure delegation).
import { appendFileSync } from "node:fs";

const NTFY_TOPIC_URL = "https://ntfy.askmeanything.work/ama-mcp-atlassian";

function firstLine(message = "") {
  return message.split("\n", 1)[0];
}

function buildSubjectList(commits) {
  return commits.map((commit) => `- ${firstLine(commit.message)}`).join("\n");
}

function buildSummary(headline, subjectList) {
  return [
    "",
    "## \u26a0\ufe0f semantic-release skip detected",
    "",
    headline,
    "",
    subjectList,
    "",
    "If releasable work is stranded here, the subject picked a non-releasing type.",
    "Ship it with a follow-up conventional `fix:`/`feat:` commit.",
    "",
  ].join("\n");
}

function writeStepSummary(summary) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  try {
    appendFileSync(path, summary);
  } catch {
    // job summary is best-effort; never break the release job
  }
}

function writeWarningAnnotation(headline) {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  console.log(`::warning::${headline.replace(/\r?\n/g, "%0A")}`);
}

async function pushNtfy(headline, subjectList) {
  const token = process.env.NTFY_TOKEN;
  if (!token) return;
  try {
    await fetch(NTFY_TOPIC_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Title: "semantic-release skip detected",
        Priority: "default",
        Tags: "warning",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: `${headline}\n\n${subjectList}`,
    });
  } catch {
    // ntfy unavailability must never break the release job
  }
}

/**
 * analyzeCommits step plugin. Delegates to @semantic-release/commit-analyzer
 * with the config passed through unchanged; surfaces the skip path only.
 *
 * @param {Object} pluginConfig semantic-release plugin config (preset, parserOpts, ...)
 * @param {Object} context semantic-release context (commits, logger, cwd, ...)
 * @returns {Promise<string|null>} release type or null (skip)
 */
export async function analyzeCommits(pluginConfig, context) {
  const { analyzeCommits: delegate } = await import("@semantic-release/commit-analyzer");
  const releaseType = await delegate(pluginConfig, context);
  if (releaseType) return releaseType;

  const commits = context.commits ?? [];
  if (commits.length === 0) return null;

  const headline = `semantic-release skip detected: analyzed ${commits.length} commit(s), no releasable type \u2014 no version will be published.`;
  const subjectList = buildSubjectList(commits);

  context.logger.warn("%s", headline);
  context.logger.warn("%s", subjectList);
  writeWarningAnnotation(headline);
  writeStepSummary(buildSummary(headline, subjectList));
  await pushNtfy(headline, subjectList);

  return null;
}
