# Source Operations Dashboard UX v2

## Scope

This update makes Coverage Dashboard the primary Source Network operations workspace. It changes only the management interface and does not modify `data/sources.json`.

## Sorting

The Dashboard supports ascending and descending sorting for:

- Score
- Updates
- Media
- Discovery
- Community
- GitHub
- Suggested/Review count

Clicking a sortable column toggles its direction. Selecting a different column starts with descending order. Product name is used as the stable secondary sort.

## Product Actions

- Clicking a Product name opens its Source Inspector directly.
- Every row includes an **Inspect** action with the same behavior.
- Suggested Count displays the number of sources whose status is `suggested` or `pending_review`.

## Filters

The Coverage filters now include:

- Missing Community
- Missing Discovery
- Missing GitHub
- Missing X

These work alongside Score, Missing Updates, Missing Media, and Needs Review filters.

## Inspector Navigation

Source Inspector includes **Previous Product** and **Next Product** controls. Navigation follows the Dashboard's current filtered and sorted order, allowing operators to review a focused queue without closing the Inspector.

The controls are disabled at the beginning or end of the current queue.

## Data Safety

Sorting, filtering, opening Inspectors, and Previous/Next navigation are client-side operations. They do not write to Registry data and do not Accept or Reject suggested sources.
