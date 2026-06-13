# Audit to Candidates Flow

The previous flow stopped at Markdown and `data/source_audit.json`. Suggested Sources read embedded `sources.json[].suggested_sources`, so audit recommendations were invisible unless separately copied into the Registry.

The implemented flow is now:

```text
Audit -> auditCandidatesFor -> data/source_candidates.json
      -> /api/registry -> Suggested Sources UI
      -> manual Accept or Reject
```

Only `pending_review` candidates appear in Source Inspector. Accept writes the candidate into the matching product's formal `sources[]`, removes it from the candidate pool, and recalculates Coverage. Reject keeps the candidate in the pool with `status=rejected`.

Candidates are deduplicated by product, normalized URL, type, and purpose. Formal sources are also checked, preventing an accepted candidate from returning during the next audit.

Manus currently has four pending candidates generated from `manus_coverage_v3.md`; none were automatically accepted.
