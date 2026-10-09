# ADR-002: confluence.js v2 Write Params Nest Under `parameters.body`

**Status:** accepted
**Date:** 2026-10-08

## Context

While fixing #18 (PR #19), `confluence_create_page` returned `400 INVALID_REQUEST_BODY — spaceId: must not be null` despite a valid string `spaceId`, and `confluence_update_page` silently dropped `title`/`version`/`status`. Library probe of `confluence.js@3.2.0` (`dist/v2/api/page.js`) revealed two non-obvious write-path contracts:

1. `page.createPage` / `page.updatePage` forward **only `parameters.body`** as the HTTP request body. Page fields (`spaceId`, `title`, `status`, `parentId`, `version`) must nest under `body`; flat fields are silently dropped before hitting the wire. Published types confirm: `CreatePage` = `{ embedded?, private?, rootLevel?, body? }`, `UpdatePage` = `{ id, body? }` (`id` is the URL path param).
2. Confluence v2 `BodyCreate.value` / `BodyUpdate.value` is a **JSON string**, not an ADF object (the read path does `JSON.parse(adfBody.value)`). The old `adfDoc as unknown as string` cast masked this.

The upstream README shows a flat `createPage({ spaceId, title, body })` example that contradicts its own published typings and runtime (upstream docs bug). PR #19 was fixed against actual runtime + published types, not the README.

This was previously captured only as inline code comments and a README note on gateway transparency. Per the agent contract ADR convention, it qualifies as a pattern future agents must follow and a "tried and abandoned" learning (flat shape never worked; upstream docs are misleading).

## Decision

1. Always nest Confluence write fields under `parameters.body` (page fields plus the inner body wrapper).
2. Always `JSON.stringify` the ADF doc for `BodyCreate.value` / `BodyUpdate.value`.
3. Prefer `satisfies Parameters<typeof client.page.createPage>[0]` over `as` casts — pin calls to the published types.
4. Pin the wire shape in unit tests (inner `body` is `Record<string, any>` — unchecked at compile time). See `tests/tools/confluence.test.ts` ("nested body payload and stringified ADF value").

## Consequences

- New Confluence write tools MUST follow this nested shape.
- If upstream ever "fixes" its implementation to match its README (flat params), our nested calls break on upgrade. Mitigation: `satisfies` typing against published `CreatePage`/`UpdatePage` types plus wire-shape unit tests fail loudly.
- Worth reporting the README/types/runtime mismatch upstream (out of scope for this ADR).
- Flat shape never worked → no behaviour regression possible; this records a "tried and abandoned" learning.
- ADR-001 (ADF↔Markdown renderer) unaffected — orthogonal concern, no conflict.

## References

- Issue #18, PR #19, ADR-001 (`001-adf-markdown-conversion.md`)
