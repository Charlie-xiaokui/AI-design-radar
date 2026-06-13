# Manus Coverage Audit v3

Audit date: 2026-06-12  
Scope: read-only audit. `data/sources.json` was not modified and no suggested source was accepted.

## Current Sources

| Type | Purpose | URL | Status | Coverage Contribution |
| --- | --- | --- | --- | --- |
| homepage | identity | https://manus.im/ | active | Identity +1 |
| x | discovery | empty | disabled | None |

Formal source count: **2**  
Active non-empty source count: **1**  
Suggested source count: **0**

## Current Coverage

| Capability | Count | Status | Score |
| --- | ---: | --- | ---: |
| Identity | 1 | Covered | 1 |
| Updates | 0 | Missing | 0 |
| Community | 0 | Missing | 0 |
| Discovery | 0 | Missing | 0 |
| Media | 0 | Missing | 0 |

**Current Coverage Score: 1/5**

The disabled X placeholder has no URL, so it does not count as Discovery coverage.

## Official Source Verification

The following first-party relationships were verified during this audit:

- [Manus homepage](https://manus.im/) directly lists Blog, Docs, Updates, Events, and Fellows.
- [Manus Updates](https://manus.im/updates) is an accessible official page titled “Manus Updates”.
- [Manus Blog](https://manus.im/blog) is active and contains recent product posts dated through June 11, 2026, including multiple product updates within the preceding 30 days.
- [Manus Events](https://events.manus.im/) is linked from the official homepage under Community and links back to the official Manus site.
- [Manus Docs](https://manus.im/docs/introduction/welcome) directly links to the official X account `https://x.com/manusai`. It also exposes a YouTube link, but this audit does not recommend it because the exact target URL was not reliably resolved.

No third-party blogs, media coverage, aggregators, SEO pages, mirrors, or personal sites are included.

## Recommended Sources

These are audit recommendations only. They have not been added to the Registry.

| Priority | URL | Type | Purpose | Missing Capability | Reason |
| --- | --- | --- | --- | --- | --- |
| P1 | https://manus.im/updates | release_notes | updates | Updates | Official Updates page linked directly from the Manus homepage. |
| P1 | https://manus.im/blog | blog | media | Media | Official, active product blog with frequent visual product and workflow posts. |
| P1 | https://x.com/manusai | x | discovery | Discovery | Official X account linked directly from Manus Docs; replaces the empty disabled placeholder after review. |
| P3 | https://events.manus.im/ | events | community | Community | Official Events and Fellows community surface linked directly from the Manus homepage. |

## Projected Coverage

If the four primary recommendations pass manual review and are accepted:

| Capability | Eligible Source | Score |
| --- | --- | ---: |
| Identity | homepage | 1 |
| Updates | release_notes | 1 |
| Community | events | 1 |
| Discovery | x | 1 |
| Media | blog | 1 |

**Projected Coverage Score: 5/5**

Coverage Community v3 resolves the previous model limitation: `events` with `purpose=community` is now an eligible Community source. Multiple sources within one capability would improve redundancy but would not increase the score beyond 5/5.

## Conclusion

Manus remains **1/5 in the current Registry**, but this is a source-configuration gap rather than a lack of official signals. Four verified first-party sources can fill all missing dimensions without relying on third-party material. The highest-priority review sequence is Updates, Blog, X, then Events.
