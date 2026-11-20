# Tables, keys, and constraints

A relational model describes tables, columns, and constraints. Each row represents an instance, keys express identity, and foreign keys connect instances across tables. Review this view to verify the transformation from ER concepts into storage structure.

## Primary and unique keys

A **primary key** identifies a row. A **unique key** expresses another combination that must not repeat. Both can contain several columns. An order reference and a line number might form an order line's composite primary key.

Composite keys work as a unit: two columns that are unique together need not be unique individually. Verify the full column list and its order in generated references.

## Foreign keys and nullability

A **foreign key** connects a child table to a key in a parent table. An order's customer reference belongs in Order because many orders can reference one customer. The referencing columns must have compatible types and point to a valid key.

A unique child reference can enforce at most one child for each parent. Allowing NULL makes that reference optional. Neither constraint requires every parent to have a child.

## Transformation patterns

| ER structure | Relational result to inspect |
| --- | --- |
| Entity | Table with columns and identity |
| Composite attribute | Columns for its simple components |
| One-to-many | Reference on the many side |
| Many-to-many | Associative table with references |
| Multivalued attribute | Separate table linked to its owner |
| Weak entity | Identity that accounts for its owner |

## Linked and independent boards

A board generated from an ER source keeps that link. Imported SQL or database metadata opens an independent relational board. This changes where structural edits belong and what regeneration can replace.

Read [Linked models and regeneration](regeneration.md) before regenerating a board that contains manual changes.
