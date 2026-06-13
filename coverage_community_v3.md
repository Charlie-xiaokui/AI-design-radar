# Coverage Community v3

## Rule

Community coverage now accepts any active, non-empty source with `purpose=community` and one of these types:

- `github_repo`
- `community`
- `forum`
- `discord`
- `reddit`
- `events`
- `slack`

`community_sources` reports the number of eligible sources. Coverage contribution remains boolean: one or more eligible Community sources contribute exactly 1 point, while duplicate or redundant sources do not add further points.

## Coverage Score

Coverage remains a 5-point score:

| Capability | Maximum |
| --- | ---: |
| Identity | 1 |
| Updates | 1 |
| Community | 1 |
| Discovery | 1 |
| Media | 1 |

The maximum score is `5/5` regardless of how many sources exist within a capability.

## Dashboard

The Coverage Dashboard Community column and Missing Community filter use the expanded rule. The Community header and values expose the eligible type list as a tooltip. Source Inspector type selectors also allow the six newly supported Community types.

## Generated Outputs

- `data/source_coverage.json` was regenerated for all 21 products.
- `source_coverage_report.md` was regenerated and now documents the Community eligibility rule and 5-point cap.
- `data/sources.json` was not modified.

The current Registry does not yet contain formal sources using the six newly added types, so existing product scores remain unchanged. Future accepted or manually added eligible Community sources will be counted immediately.

## Regression Coverage

The Source Network regression suite verifies:

1. Each eligible type independently satisfies Community coverage.
2. All eligible sources appear in `community_sources` counts.
3. Multiple Community sources still contribute only 1 point.
4. Coverage Score never exceeds 5.
5. Deleting the only Community source reduces Coverage by exactly 1 point.
