# Source Inspector Operations v2

## Formal Source Deletion

Deletion now sends the current formal source identity as a request body:

- `id`
- normalized `url`
- `type`
- `purpose`

The server resolves the target in this order:

1. Match the exact `source.id` when it is present.
2. If the id is absent or stale, match normalized URL + type + purpose.

Only one matching source is removed. This allows duplicate URLs with different source types or purposes to remain independently manageable.

After a successful delete:

1. The API writes the updated `sources[]` array to `data/sources.json`.
2. Coverage JSON and reports are recalculated.
3. The returned product replaces the browser's local product immediately, removing the row without waiting for a full reload.
4. The Registry is reloaded to confirm persisted data and refreshed Coverage.

## Drag Sorting

Each persisted Formal Source row has a drag handle on its left side. Dragging a row above or below another row sends the complete ordered list of source IDs to the server.

The server validates that:

- every current source ID is present;
- no ID is duplicated;
- no unknown ID is included.

The resulting array order is written directly to `data/sources.json`, so the same order is restored after page refresh.

## Default Grouping

New manually added sources are inserted using the recommended purpose order:

1. identity
2. updates
3. media
4. discovery
5. community

Once an operator manually drags sources, the saved array order takes precedence and is not automatically resorted on page refresh.

## Regression Coverage

`npm run test:source-network` verifies:

- deleting a normal source by ID;
- deleting a manually added source;
- deleting one source among duplicate normalized URLs using type and purpose;
- Coverage recalculation after deleting the only community source;
- custom source order surviving a new JSON repository instance and page-like reload.

No Source Network schema fields were added or changed.
