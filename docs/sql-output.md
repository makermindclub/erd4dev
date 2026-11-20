# Review SQL output

The SQL view expresses the relational board in the project's database dialect. Inspect it after reviewing domain meaning, cardinality, and keys.

## Read the output in order

1. Confirm the dialect matches the target engine.
2. Check names, types, sizes, and nullability.
3. Check primary and unique keys, including composite keys.
4. Follow foreign keys to their target tables and columns.
5. Compare warnings and output with application requirements.

## Schema definition versus migration diff

Generated SQL describes the represented structure. It does not calculate how to transform an existing database or migrate its data. A new table definition does not explain how to rename existing columns, backfill required values, or preserve unrepresented constraints.

Plan those changes through the application's migration workflow and test them against a development copy of the existing schema.

## Features outside the diagram

Imported snapshots do not preserve every engine feature. Defaults, checks, triggers, views, ordinary indexes, and referential actions may need separate definitions. Compare generated output with the original schema when those features matter.

## Filtering affects exports

The relational board's Laravel table visibility preference also controls SQL and JSON exports. Confirm the intended tables are present. The users table is preserved, so review it against the host application's authentication schema.

For PHP models and migration scaffolding, continue with [Blueprint drafts](blueprint-drafts.md).
