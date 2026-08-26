# ADR-001: Minimal Custom ADF↔Markdown Renderer

**Status:** accepted
**Date:** 2026-08-26

## Context

Confluence v2 API requires page body as ADF (Atlassian Document Format) JSON. Agents interact with pages using markdown. Two conversion directions needed:

1. **Markdown → ADF** (create/update pages, add comments)
2. **ADF → Markdown** (read page content)

Options evaluated:
- `@atlaskit/adf-utils` — official Atlassian package, full ADF coverage, ~200KB+ dependency
- Custom minimal renderer — ~100 lines, covers common markdown constructs

## Decision

Use a minimal custom renderer in `src/client/adf.ts` covering:

- **Markdown → ADF**: headings (`#`–`######`), bullet lists (`-`/`*`), code blocks (``` ``` ```), paragraphs, inline text marks (bold, italic, inline code)
- **ADF → Markdown**: headings, paragraphs, bullet lists, code blocks, text marks (strong, em, code)

## Consequences

- **Pro:** Zero new dependencies. ~100 lines total. Fast to maintain.
- **Pro:** Covers 90% of agent-generated Confluence content (text, headings, lists, code).
- **Con:** Does not handle tables, images, links, nested lists, task lists, or block quotes.
- **Mitigation:** `toADF` falls back to paragraph nodes for unsupported constructs. Iterate later if agents need richer conversion.

## Scope Limits

This renderer is intentionally minimal. If a future task requires full ADF fidelity (e.g., tables, media), evaluate `@atlaskit/adf-utils` again and update this ADR.
