# Candidate Display Fix

Date: 2026-06-12

## Root Cause

Suggested Sources did read `data/source_candidates.json`, but product identity and status matching were inconsistent across layers:

- Inspector only compared `candidate.product` with `source.id`, `source.slug`, or `source.product_name` using lowercase equality.
- Candidate repository required exact `candidate.product === product_name` matches.
- Coverage used the same exact product-name match.
- Only `pending_review` was visible; legacy `pending` and `suggested` records were ignored.

This allowed the UI, candidate actions, and Coverage count to disagree when candidates used `product_slug`, `product_id`, `source_id`, an `src_` prefix, or a compatible legacy status.

## Diagnostic Output

Candidate pool before browser validation:

```text
All candidates: 4
Manus candidates: 4
Inspector product: id=src_manus, slug=manus, product_name=Manus
```

```json
[
  {
    "product": "Manus",
    "product_id": null,
    "product_slug": null,
    "slug": null,
    "product_name": null,
    "status": "pending_review",
    "url": "https://manus.im/updates"
  },
  {
    "product": "Manus",
    "product_id": null,
    "product_slug": null,
    "slug": null,
    "product_name": null,
    "status": "pending_review",
    "url": "https://manus.im/blog"
  },
  {
    "product": "Manus",
    "product_id": null,
    "product_slug": null,
    "slug": null,
    "product_name": null,
    "status": "pending_review",
    "url": "https://x.com/manusai"
  },
  {
    "product": "Manus",
    "product_id": null,
    "product_slug": null,
    "slug": null,
    "product_name": null,
    "status": "pending_review",
    "url": "https://events.manus.im/"
  }
]
```

The Inspector now also logs this diagnostic structure as `Source Candidate Debug` whenever Manus is rendered.

## Unified Matching

Candidate identity is selected from:

```text
product || product_slug || product_name || product_id || source_id
```

Product identity compares against all normalized values from:

```text
id, slug, product_name, name
```

Normalization applies lowercase, trim, spaces-to-hyphens, and removal of the `src_` prefix. Therefore `Manus`, `manus`, and `src_manus` resolve to the same product.

Visible candidate statuses are now:

```text
pending_review
pending
suggested
```

`accepted` and `rejected` remain hidden.

## Browser Verification

The browser test used an isolated copy of the JSON files.

1. Opened Manus Inspector and confirmed four Suggested Sources:
   - `https://manus.im/updates` - `release_notes / updates`
   - `https://manus.im/blog` - `blog / media`
   - `https://x.com/manusai` - `x / discovery`
   - `https://events.manus.im/` - `events / community`
2. Accepted the release-notes candidate.
3. Confirmed it immediately disappeared from Suggested Sources.
4. Confirmed it appeared in Formal Sources.
5. Confirmed Coverage changed from `1/5` to `2/5` and Suggested Count changed from 4 to 3.
6. Accepted the remaining three capability candidates and confirmed Coverage reached `5/5` with zero pending candidates.

Accept removes the candidate from `source_candidates.json`; Reject retains it with `status: rejected`. Both paths recalculate Coverage.

## Regression Coverage

Tests cover:

- `candidate.product = "Manus"`
- `candidate.product = "manus"`
- `candidate.product_slug = "manus"`
- `candidate.product_id = "src_manus"`
- fallback from an empty `product` to `product_slug`
- visible `pending_review`, `pending`, and `suggested` statuses
- hidden `accepted` and `rejected` statuses
- accepting all four Manus candidates raises Coverage from `1/5` to `5/5`
