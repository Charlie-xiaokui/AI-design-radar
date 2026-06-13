# Suggested Source Accept Flow Audit

## Expected transition

`pending_review -> verified`

The verified record remains in `suggested_sources[]` as audit history, but the Source Inspector only renders entries whose status is `suggested` or `pending_review`. As a result, an accepted item disappears from the visible Suggested Sources list without losing its review history.

## Data flow

1. The user clicks **Accept** in Source Inspector.
2. `public/app.ts` reads the current URL, type, and purpose directly from the suggestion card and sends them with `POST /api/suggestions/:productId/:suggestionId/accept`.
3. `src/server.ts` calls `acceptSuggestedSource()`.
4. `acceptSuggestedSource()` first resolves by id, then falls back to normalized URL + type + purpose when the id is stale or no longer matches.
5. The request values are treated as the final edited data. The candidate is converted into a formal `ProductSource` and appended to `sources[]` unless it is a duplicate.
6. The candidate status is changed to `verified` in `suggested_sources[]`.
7. `JsonSourceRepository.update()` validates the product and atomically rewrites `data/sources.json`.
8. The server regenerates `data/source_coverage.json`, `source_coverage_report.md`, and the source review output.
9. The API returns the updated product. The browser then reloads `/api/registry`.
10. `render()` refreshes the Source list and Coverage Dashboard; `renderInspector()` hides verified/rejected candidates from Suggested Sources.

## Debug log

Every successful Accept writes the requested transition log after persistence succeeds:

```ts
console.log(source.id, action, beforeStatus, afterStatus);
```

Example:

```text
suggested-claude-anthropic-x accept pending_review verified
```

## Persistence and refresh guarantees

- Formal sources and candidate review history are stored in `data/sources.json`.
- Coverage in `/api/registry` is calculated from the newly persisted product list.
- The generated coverage JSON/report are refreshed by the same API request.
- Reloading the page fetches `/api/registry` again, so verified status, the formal source, and updated Coverage remain visible after refresh.
- The primary duplicate identity is normalized URL + type + purpose.
- If any formal source already has the same normalized URL, no second source is added even when type or purpose differs; the candidate is still marked `verified`.

## Regression coverage

`npm run test:source-network` uses a temporary JSON file with the real `JsonSourceRepository`, accepts a `pending_review` candidate, creates a new repository instance to simulate refresh/restart, and verifies:

- status is `verified`;
- the formal source exists;
- the accepted candidate no longer contributes to `needs_review_count`;
- Coverage reflects the accepted source after reload.

The suite also covers original Accept, edited URL Accept, normalized duplicate URL Accept, and Accept after changing purpose.
