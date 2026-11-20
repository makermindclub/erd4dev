# Linked models and regeneration

A relational board generated from ER records its source. ERD4Dev can detect source changes and explain what regeneration would change in that board.

## Linked and independent models

| Origin | Structural workflow |
| --- | --- |
| Generated from ER | Start structural changes in the ER source |
| Relational JSON import | Edit the independent relational board |
| SQL or database import | Edit the independent relational board |

An ER JSON import opens an ER board instead. The JSON shape determines which editor you start in.

## What makes a model outdated

Source comparison tracks structure rather than layout. Entity, attribute, key, or relationship changes can make a generated model outdated; moving a shape alone does not.

The change report describes differences in tables, columns, types, nullability, keys, and foreign keys. It describes diagram regeneration, not a database migration script.

## Regeneration workflow

1. Finish the structural change in ER.
2. Open its linked relational model and read the report.
3. Export JSON if you need to preserve the current board or manual adjustments.
4. Use **Regenerate from ER** and review its confirmation.
5. Inspect the resulting model and outputs again.

Regeneration rebuilds from the ER source and can replace manual relational adjustments. It is not a bidirectional merge and does not update database tables.
