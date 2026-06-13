# Candidate Runtime Debug

Date: 2026-06-12
Runtime checked: `http://127.0.0.1:4173`

## Root Cause

The JSON file and current source code were correct, but port 4173 was still served by a stale Node process started before the independent candidate pool was added to `/api/registry`.

Before restart:

- `data/source_candidates.json`: 4 Manus candidates.
- Live `/api/registry`: no `candidates` property.
- Live Manus Coverage: `needs_review_count = 0`.
- Live Manus Inspector: empty Suggested Sources state.

After restarting the actual service from the current workspace:

- `/api/registry.candidates.length = 4`.
- Manus `needs_review_count = 4`.
- Manus Inspector renders four Suggested Sources.

## Candidate File

`data/source_candidates.json` contains four records, so its first ten entries are the following four entries:

```json
[
  {
    "product": "Manus",
    "url": "https://manus.im/updates",
    "type": "release_notes",
    "purpose": "updates",
    "priority": "P1",
    "source": "manus_coverage_v3.md",
    "status": "pending_review"
  },
  {
    "product": "Manus",
    "url": "https://manus.im/blog",
    "type": "blog",
    "purpose": "media",
    "priority": "P1",
    "source": "manus_coverage_v3.md",
    "status": "pending_review"
  },
  {
    "product": "Manus",
    "url": "https://x.com/manusai",
    "type": "x",
    "purpose": "discovery",
    "priority": "P1",
    "source": "manus_coverage_v3.md",
    "status": "pending_review"
  },
  {
    "product": "Manus",
    "url": "https://events.manus.im/",
    "type": "events",
    "purpose": "community",
    "priority": "P3",
    "source": "manus_coverage_v3.md",
    "status": "pending_review"
  }
]
```

Candidate total: 4. Manus candidate total: 4.

## Live API Results

The application actually loads `/api/registry`.

| Endpoint | Status | Result |
| --- | ---: | --- |
| `/api/sources` | 404 | `{ "error": "API route not found" }` |
| `/api/source-candidates` | 404 | `{ "error": "API route not found" }` |
| `/api/registry` before restart | 200 | Response omitted the `candidates` property. |
| `/api/registry` after restart | 200 | Response includes `candidates` with four Manus records. |

Relevant live `/api/registry` result after restart:

```json
{
  "candidateCount": 4,
  "currentProduct": {
    "id": "src_manus",
    "slug": "manus",
    "product_name": "Manus"
  },
  "coverage": {
    "needs_review_count": 4,
    "coverage_score": 1
  }
}
```

## Frontend Runtime Result

The Manus Inspector now logs `Source Candidate Debug` with the requested fields. The live browser state was:

```json
{
  "allCandidatesLength": 4,
  "currentProduct": {
    "id": "src_manus",
    "slug": "manus",
    "product_name": "Manus"
  },
  "matchedCandidatesLength": 4,
  "matchedCandidateUrls": [
    "https://manus.im/updates",
    "https://manus.im/blog",
    "https://x.com/manusai",
    "https://events.manus.im/"
  ]
}
```

## Browser Verification

The current `127.0.0.1:4173` page was refreshed after restarting the service. Manus Inspector displayed all four candidate cards and did not display the empty-state message.

The active service on port 4173 now runs the current workspace build and returns the independent candidate pool through `/api/registry`.
