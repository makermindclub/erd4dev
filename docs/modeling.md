# Model your domain

Start in the **ER Model** tab when the structure is new.

1. Add an entity and give it a valid identifier.
2. Use the pencil action to rename the entity and edit its fields.
3. Mark primary and unique keys where the data model requires them.
4. Click **Connect**, or drag a port from one entity to another, to create a relationship.
5. Open **Relational** to review tables, foreign keys, and derived structure.

## Linked models

When a relational model is linked to an ER model, make structural changes in the ER source. ERD4Dev can regenerate the relational representation from that source.

Imported relational boards are independent. You can rename tables and columns, add or remove columns, and edit keys directly on the canvas.

## Work from a small example

Create Customer and Order first. Give both a primary key, add an email to Customer and a placement date to Order, then connect the two. State the rule explicitly: a customer may have many orders; an order must have one customer.

Generate or open the relational result and locate the customer reference on Order. This checks your model against a known expectation before adding more entities.

## Relationship behavior

In the ER editor, set cardinality at the relationship ends. In an independent relational board, foreign-key uniqueness and nullability describe at-most-one versus many and optional versus required references. Composite and recursive relationships need particular attention to column combinations and roles.

Changes that would leave a relationship pointing to a missing key are rejected.

## Keep layout and structure separate

Arrange related entities together to improve readability. Moving nodes changes presentation, while changing names, types, keys, or relationships changes the schema. A tidy layout is helpful, but does not replace structural review.

Continue with [Relationship patterns](relationships.md), then [Review the model](review.md).

For the actual interface in motion, see [Recorded walkthroughs](recordings.md) and the [ER More menu](er-menu.md).
