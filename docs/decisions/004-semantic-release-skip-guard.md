# ADR-004: semantic-release Skip Guard Surfaces Skipped Releases

**Status:** accepted
**Date:** 2026-10-09

## Context

After #25/#27 (ADR-003), two blocking layers guard releases: the `pr-title` CI job and the release-workflow commit-range gate. Both hard-fail on **non-conventional** subjects. Residual gap: `semantic-release` itself still exits **green** with `There are no relevant changes, so no new version is released.` whenever `@semantic-release/commit-analyzer` finds no releasable type. One missed-publish class is therefore still silent: a squash subject that is conventional but the **wrong type** (e.g. `docs: …` on a PR whose diff is actually a `fix`). The gate passes, the analyzer returns `null`, the fix strands on `main` forever. Evidence chain: release run `37902172888` (#25). `success`/`fail` plugin hooks cannot help — semantic-release invokes neither on the skip path; only `analyzeCommits` sees the commits and the analyzer result at the right moment.

## Decision

Warn-only surfacing at the `analyzeCommits` layer, via a local plugin (`scripts/release-skip-guard.mjs`) that wraps `@semantic-release/commit-analyzer` (config passthrough, pure delegation on the release path). On the skip path with commits in the range it emits: `logger.warn`, a GitHub Actions job summary section, a `::warning::` annotation, and an ntfy push (topic `ama-mcp-atlassian`, Priority `default`, Tags `warning`) — all best-effort, never failing the release job. **No hard-fail.**

- Hard-fail-on-any-skip breaks every legitimate `docs:`/`chore:` merge (release job red on every docs PR).
- Path-heuristic hard-fail ("non-releasing type but diff touches `src/`") has real false positives (`docs: add JSDoc …`) and per-commit diff complexity; documented as the upgrade path if warn-only proves insufficient.
- The residual risk (conventional-but-wrong-type subject) is a process problem — the PR title is the release vehicle (ADR-003) and reviewer discipline covers intent. This layer's job is **non-silent skip**, not blocking.

## Consequences

- Every skip with commits in range now emits an ntfy push (Priority `default`) and a job-summary warning — expected skips (`docs:`/`chore:` merges) generate informational noise; tunable later (e.g. restrict to skips whose commits touch `src/`).
- Three-layer mitigation stack: (1) `pr-title` guard — blocking, non-conventional titles; (2) release commit-range gate — blocking, non-conventional commits on push (ADR-003); (3) skip guard — visibility, analyzer skips. No change to layers 1–2, `commitlint.config.ts`, or the conventional-commits preset.
- `NTFY_TOKEN` must be added to repo Actions secrets; until then the plugin degrades to log + job summary + annotation only.
- ntfy endpoint unreachable from runners must never break a release — fetch errors are caught and swallowed.
