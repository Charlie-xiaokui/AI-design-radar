# Multi Purpose Source Validation

Validation date: 2026-06-13

Test product: Manus (`src_manus`)

## Result

**PASS**

The validation used the current `data/sources.json`, the real Coverage service, automated Candidate Accept tests, and the running page at `http://127.0.0.1:4173`.

## Source Data

| URL | Legacy Purpose | Primary Purpose | Purposes | Result |
| --- | --- | --- | --- | --- |
| https://manus.im/updates | updates | updates | updates, media | PASS |
| https://manus.im/blog | media | media | media, updates | PASS |
| https://x.com/manusai | discovery | discovery | discovery, media | PASS |
| https://events.manus.im/ | community | community | community | PASS |

The array order above is the persisted JSON order. Inspector checkboxes use the fixed UI order `identity, updates, media, discovery, community`, without changing the stored values.

## Inspector Grouping

Real browser validation confirmed:

| URL | Inspector Group | Result |
| --- | --- | --- |
| https://manus.im/updates | Updates | PASS |
| https://manus.im/blog | Media | PASS |
| https://x.com/manusai | Discovery | PASS |
| https://events.manus.im/ | Community | PASS |

Grouping follows `primary_purpose`; secondary purposes do not create duplicate rows.

## Coverage

Coverage was calculated from normalized `purposes[]`:

| Dimension | Count |
| --- | ---: |
| Identity | 1 |
| Updates | 2 |
| Community | 1 |
| Discovery | 2 |
| Media | 3 |

Dashboard result: **5/5**.

The running Dashboard displayed the Manus row as `Identity 1 / Updates 2 / Community 1 / Discovery 2 / Media 3 / Score 5/5`.

## Candidate Accept

`npm run test:source-candidates` passed. The test edits a Candidate to:

```json
{
  "purpose": "media",
  "primary_purpose": "media",
  "purposes": ["media", "updates"]
}
```

After Accept, the formal Source retains `primary_purpose` and the complete `purposes[]`, and contributes to both Media and Updates Coverage.

## Legacy Compatibility

The Manus homepage remains stored with only:

```json
{
  "purpose": "identity"
}
```

Runtime normalization produced:

```json
{
  "purpose": "identity",
  "primary_purpose": "identity",
  "purposes": ["identity"]
}
```

Result: **PASS**.

## Field Integrity

- Manus retains 35 product-level fields and 7 formal Sources.
- Each of the four tested records retains all 17 existing Source Network runtime fields.
- Each also contains `primary_purpose` and `purposes`, for 19 fields total.
- No required field was missing.

Result: **PASS**.

## Commands

- `npm run test:source-candidates` — PASS
- `npm run test:source-network` — PASS
- `npm run typecheck` — PASS, 41 TypeScript files parsed
- `npm run build:client` — PASS
- Real browser validation at `127.0.0.1:4173` — PASS
