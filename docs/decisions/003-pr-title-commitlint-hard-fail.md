# ADR-003: PR Title commitlint Guard Hard-Fails

**Status:** accepted
**Date:** 2026-10-09

## Context

GitHub squash-merge subjects are taken from PR titles and never pass through the husky `commitlint` hook (hooks run on local commits, not on the synthesized squash commit). A non-conventional subject reaching `main` therefore lands silently — and `semantic-release` then logs `There are no relevant changes, so no new version is released.` and exits **green**. Evidence: release run `37902172888` for the PR #19 merge (`Fix #18: …`), plus `Ref #21: …` (#22/#23). The fix shipped as the `pr-title` CI job (this repo, `.github/workflows/ci.yml`), but the issue also required deciding whether a bad PR title should hard-fail CI or only warn.

## Decision

The `pr-title` job **hard-fails** CI on a non-conventional PR title. There is no warn-only mode.

- A warn gate does not block the merge, so the non-conventional squash subject still lands and the release still skips — preserving the exact failure mode the gate exists to close. Blocking is the gate's entire value.
- Escape hatch at the job level: none. To ship a non-conventional squash subject, a human retitles the PR (the title *is* the release vehicle) or accepts that no release will be published.
- The complementary safety net is the release-workflow gate (`.github/workflows/release.yml`): before `bun run release`, lint every commit introduced **by that push** (`github.event.before..github.event.after`) with `bunx commitlint --from … --to …`, so a non-conventional subject reaching `main` by any path (direct push, workflow bypass) fails the release job loudly and a missed publish can never be silent again.
- The gate range is the push's own commits, **not** `last-tag..HEAD`. A last-tag range deadlocks here: `main` already contains non-conventional subjects (`Ref #21:`, `Ref #17:`, `Fix #18:` after tag `v1.2.1`), the tag only advances when semantic-release publishes, and the gate runs before release — so every push to `main` would fail and no release could ever move the tag. The per-push range lints only new commits, never re-litigates merged history, and needs no manual baseline.
- The range gate uses `commitlint --from/--to` (lints each commit individually), **not** `git log --format=%s | commitlint`. Piped multi-line stdin is parsed by commitlint as a **single** message, so only the first subject is linted — verified locally: `printf 'fix: a\nchore: b\nFix #18: c\n' | bunx commitlint` exits `0`.

## Consequences

- PRs titled `Fix #18: …` / `Ref #21: …` cannot merge until retitled. Conventional types (`feat`, `fix`, `chore`, `docs`, `test`, `ci`, `refactor`, `perf`, `build`, `style`, `revert`) pass — but only `feat`/`fix` (and `BREAKING CHANGE`) trigger a publish. A conventional-but-non-releasing title (`docs: …`) merges and publishes nothing — correct, not a bug.
- The job runs on `pull_request` types `[opened, edited, synchronize, reopened]`, so re-titling re-validates the gate; the `if: github.event_name == 'pull_request'` guard means it is **skipped (green), not failed**, on `push` to `main`.
- PR titles are now load-bearing for releases.
- `lint-and-test` also re-runs on `edited` (same `types` list) — extra CI minutes, no correctness impact.
- ADR-001 / ADR-002 unaffected.
- Third layer: the semantic-release skip guard (ADR-004) surfaces analyzer skips that the PR-title and commit-range gates cannot catch (conventional-but-wrong-type subjects).
