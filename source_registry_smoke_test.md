# Source Registry Smoke Test

Date: 2026-06-12

## Result

PASS. All ten paths were verified in the browser against an isolated copy of the registry data. Production `data/sources.json` and `data/source_candidates.json` were not modified.

| # | Path | Result | Browser evidence |
|---|---|---|---|
| 1 | Coverage Dashboard loads | PASS | Displayed `21 / 21 products` and rendered Inspect actions. |
| 2 | Inspect Manus / Claude / Cursor | PASS | Each product opened the matching Inspector title and Formal Sources section. |
| 3 | Inspector closes | PASS | The Inspector close control closed only the Inspector dialog. |
| 4 | Add Source opens and closes | PASS | Add Source dialog opened from the header and its close control returned to the dashboard. |
| 5 | Suggested Sources with candidates | PASS | Manus initially displayed four `pending_review` candidates. |
| 6 | Suggested Sources empty state | PASS | Claude displayed `暂无待审核候选信号源`. |
| 7 | Accept Candidate | PASS | Accepting `https://manus.im/updates` removed it from the pending list and added it to Manus Formal Sources. Source count changed from 2 to 3. |
| 8 | Reject Candidate | PASS | Rejecting `https://events.manus.im/` removed it from the pending UI and persisted it as `rejected` in the candidate pool. |
| 9 | Delete Formal Source | PASS | A temporary accepted Manus media source disappeared immediately, source count changed from 3 to 2, Coverage refreshed to `1/5`, and refresh kept it deleted. |
| 10 | Drag Sort Formal Source | PASS | Claude Updates changed from `news, releases, releases RSS, release notes` to `news, release notes, releases, releases RSS`; the JSON order changed and survived refresh. |

## Data Verification

Candidate flow after the test:

```json
[
  { "url": "https://x.com/manusai", "status": "pending_review" },
  { "url": "https://events.manus.im/", "status": "rejected" }
]
```

Persisted Claude Updates order after drag:

```json
[
  "claude-anthropic-news",
  "claude-release-notes",
  "claude-code-releases",
  "claude-code-releases-rss"
]
```

The browser console contained no warnings or errors at the end of the run.

## Fixes Required By The Smoke Test

1. Replaced blocking native `confirm()` deletion with an application dialog. Confirmation now remains inside the Inspector interaction flow and can be opened, cancelled, or accepted without blocking the page runtime.
2. Added Pointer Events support to Formal Sources drag sorting. Existing HTML5 drag events remain supported, while pointer-driven dragging now updates the Drop Indicator and persists through the existing reorder API.

## Regression Verification

The following commands passed:

```text
npm run typecheck
npm run test:source-network
npm run test:source-candidates
npm run test:inspector-navigation
npm run test:source-auditor
```

Production data hashes after the test:

```text
data/sources.json            1e185c5b92acbb89c1b909cf6749441e2faead6f236a6226471cc4d73ab7a8bb
data/source_candidates.json  501f6deabf77fccee66c38dc673fb5af1f6b502ca30b4c59b1c9bf67b4fd2bc8
```
