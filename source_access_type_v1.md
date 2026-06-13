# Source Access Type v1

## Goal

Source Network now distinguishes whether a source is safe for automatic collection or should stay in manual/discovery workflows.

`access_type` values:

| Value | Meaning |
| --- | --- |
| `public` | Publicly reachable source; eligible for the automatic main collection queue. |
| `login_required` | Requires login or has restricted access; excluded from automatic collection. |
| `manual` | Human-maintained source; excluded from automatic collection. |
| `unknown` | Not yet classified; excluded from automatic collection. |

## Compatibility Rule

`data/sources.json` was not batch rewritten.

Old sources without `access_type` are normalized at read time by `normalizeAccessType(source)`:

| Source type | Default access_type |
| --- | --- |
| `homepage`, `docs`, `blog`, `news`, `release_notes`, `github`, `github_repo`, `github_releases`, `github_releases_rss`, `rss`, `youtube`, `product_hunt`, `changelog` | `public` |
| `x`, `discord`, `slack` | `login_required` |
| Other / uncertain | `unknown` |

Only a manual Inspector save writes `access_type` back into a formal source.

## UI Behavior

Source Inspector now shows an `access_type` badge on each source row:

- `Public`
- `Login Required`
- `Manual`
- `Unknown`

Formal Sources support editing `access_type` through a select field.

Suggested Sources / Candidate Sources also support editing `access_type`. If a candidate has no stored `access_type`, the UI displays the inferred default.

When the source type is changed in the editor, the access selector updates to the default for that type. The user can still override it before saving.

## Candidate Accept Rule

When accepting a candidate:

- If the candidate already has `access_type`, it is preserved.
- If it does not, the accepted formal source receives the inferred default from its type.
- The candidate is still accepted through the candidate pool only; it is not auto-written into `sources.json` before Accept.

Examples:

- `x` candidate without `access_type` becomes `login_required`.
- `blog` candidate with `access_type=manual` stays `manual`.

## Collection Queue Rule

Coverage Score is not affected by `access_type`.

Automatic collection is affected:

- `public` sources can enter the main automatic scan/audit queue.
- `login_required`, `manual`, and `unknown` sources are excluded from the main automatic scan/audit queue.
- X remains a URL signal source only and does not enter automatic content collection.

Updated queues:

- `audit-sources` filters nested `sources[]` with `isPublicAccess(source)`.
- `scan-sources` filters legacy flat URL fields with inferred access type, so `x_url` is skipped by default.

## Validation

Commands run:

```bash
npm run build:client
npm run test:source-network
npm run test:source-auditor
npm run test:inspector-navigation
npm run test:source-candidates
npm run typecheck
```

Results:

- Old `sources.json` reads normally without stored `access_type`.
- `data/sources.json` was not batch rewritten; no `"access_type"` entries were introduced.
- Inspector displays access badges and edit controls.
- Candidate Accept preserves explicit `access_type`.
- Candidate Accept infers `access_type` when missing.
- Public sources enter the automatic queue.
- Login-required sources do not enter the automatic queue.

Browser validation on `http://127.0.0.1:4173/`:

- Opened Manus Source Inspector.
- Formal Sources showed access badges and editable access selectors.
- Manus `homepage`, `release_notes`, and `blog` displayed `public`.
- Manus `x` sources displayed `login_required`.
- Manus had no pending candidates; Suggested Sources correctly rendered the empty state.
