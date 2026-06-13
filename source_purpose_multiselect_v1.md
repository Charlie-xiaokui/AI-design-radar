# Source Purpose Multi-select v1

## Data Model

Each formal or candidate source keeps the legacy `purpose` field and may add:

```json
{
  "purpose": "updates",
  "primary_purpose": "updates",
  "purposes": ["updates", "media"]
}
```

`primary_purpose` controls Inspector grouping. `purposes` records every Coverage capability contributed by the source. `purpose` mirrors `primary_purpose` for backward compatibility.

## Legacy Compatibility

When a record only has `purpose`, the application reads it as:

```text
primary_purpose = purpose
purposes = [purpose]
```

If `primary_purpose` is missing, the first selected purpose becomes primary. Saving always ensures `purposes` contains `primary_purpose`.

## Coverage Calculation

Identity, Updates, Media, Discovery, and Community counts are calculated from active sources whose normalized `purposes[]` contains the corresponding value. One source may therefore contribute to multiple dimensions, while each dimension still contributes at most one point to the 5-point Coverage Score.

## Inspector Grouping

Formal Sources are grouped only by `primary_purpose`. Secondary purposes do not duplicate a source row into other groups. The legacy `purpose` field remains synchronized with the primary value.

## Candidate Accept

Suggested Sources expose a Primary Purpose selector and purpose checkboxes. Save and Accept use the current edited values. Accepted sources retain `primary_purpose` and `purposes`; legacy candidates are normalized to a one-item array before acceptance.
