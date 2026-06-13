# Audit Candidate Pipeline

## Data Flow

```text
Audit / coverage review
        |
        v
auditCandidatesFor(products)
        |
        v
data/source_candidates.json
        |
        v
GET /api/registry
        |
        v
Source Inspector > Suggested Sources
        |
        +--> Reject: retain candidate, status=rejected
        |
        +--> Accept: add product.sources[] -> remove candidate -> recalculate Coverage
```

## Candidate Pool

The independent candidate pool is `data/source_candidates.json`. Each record contains:

| Field | Meaning |
| --- | --- |
| product | Product name used to associate the candidate with a Registry product |
| url | Candidate URL |
| type | Source Network source type |
| purpose | Coverage purpose |
| priority | Candidate policy tier: P1, P2, or P3 |
| source | Audit or report that generated the candidate |
| status | pending_review, accepted, or rejected |

Successful Accept removes the record from the candidate pool, so `accepted` is a valid transition state rather than a retained pool record. Reject records remain persisted with `status=rejected`.

## Audit Generation

`npm run audit-sources` now upserts audit recommendations into the candidate pool after audit outputs are written. `npm run generate:audit-candidates` performs the same candidate synchronization without rerunning network collectors.

Deduplication uses:

```text
product + normalized_url + type + purpose
```

Re-audit behavior:

- Existing pending candidates are not duplicated.
- Existing rejected candidates are not recreated as pending.
- Candidates already present in formal `product.sources[]` are not recreated after Accept.

Audit candidate generation never writes candidates into `sources.json`.

## Suggested Sources UI

`GET /api/registry` reads `data/source_candidates.json` and exposes candidates with a derived `candidate_key`. Source Inspector filters by product and renders only `pending_review` candidates.

The legacy `source.suggested_sources` field remains unchanged for JSON compatibility, but it is no longer the Source Inspector data source.

Candidate actions use:

- `PUT /api/candidates/:productId/:candidateKey` for URL/type/purpose edits.
- `POST /api/candidates/:productId/:candidateKey/accept` to add a formal source and remove the candidate.
- `POST /api/candidates/:productId/:candidateKey/reject` to retain the candidate as rejected.

## Edit Before Accept

Candidates can be edited before review is completed. Saving an edit persists the current URL, type, and purpose in `data/source_candidates.json`, then refreshes Source Inspector so the card receives its newly calculated candidate key.

Accept also supports the unsaved-edit path: the current editor values are sent with the action and become the final formal Source values. If the client still carries the pre-edit key, the server falls back to matching the current normalized URL, type, and purpose. This prevents a saved edit from making the candidate impossible to Accept.

After Accept:

1. The edited values are written to the matching product's `sources[]`.
2. The edited candidate is removed from `data/source_candidates.json`.
3. Source Inspector and Coverage reload from persisted data.

## Manus Validation

The Manus audit generated four pending candidates:

| URL | Type | Purpose | Priority |
| --- | --- | --- | --- |
| https://manus.im/updates | release_notes | updates | P1 |
| https://manus.im/blog | blog | media | P1 |
| https://x.com/manusai | x | discovery | P1 |
| https://events.manus.im/ | events | community | P3 |

Observed in the running UI:

- Manus Suggested Sources: 4 pending records.
- Coverage Dashboard Suggested Count: 4.
- Current Coverage remains 1/5 because no candidate was automatically accepted.

Accept was verified against temporary copies of `sources.json` and `source_candidates.json`:

1. The Updates candidate was added to Manus `sources[]`.
2. The accepted candidate disappeared from the candidate pool.
3. Coverage increased from 1/5 to 2/5.
4. Re-running audit candidate generation did not recreate the accepted candidate.

The production `data/sources.json` was not changed during this validation.

## File Audit

- `data/source_audit.json`: existing product-level activity and media audit output; it does not contain candidate records.
- `data/source_candidates.json`: new canonical candidate pool.
- `suggested_sources.json`: not used and not created.
- Embedded `sources.json[].suggested_sources`: retained only for backward-compatible data loading and legacy APIs.
