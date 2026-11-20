# Review the model

Review connects a plausible diagram to an output you can trust. Check business meaning first, relational structure second, and generated files last. A technically valid reference can still express the wrong business rule.

## Review the domain

Read each entity as a sentence: “One row represents…” If it describes unrelated things, reconsider the entity's responsibilities. Check that attributes belong to their entities and relationships express the intended rules.

In the shop example, a product description belongs to Product, while quantity ordered belongs to the order–product association. Putting quantity on Product would share that value across all orders and change its meaning.

## Review cardinality

Read each relationship in both directions. Check minimum and maximum participation separately. An order may require a customer while a customer may have no orders. A required customer foreign key expresses the first rule; it does not force each customer to place an order.

Pay particular attention to one-to-one relationships, recursive roles, weak entities, and associations with several participants. These need more explanation than a connecting line provides.

## Review the relational result

| Check | Question |
| --- | --- |
| Identity | Can every row be identified, including weak entities? |
| Uniqueness | Is each rule on the correct combination of columns? |
| References | Does every foreign key target the intended key? |
| Nullability | Are optional and required values represented correctly? |
| Types | Are referenced columns compatible in type and size? |
| Extra tables | Do associative and multivalued tables preserve the domain meaning? |

Read transformation warnings. Some minimum-participation rules require application validation or additional constraints.

## Review source changes

A linked relational model can become outdated when its ER source changes. Inspect the change report and preserve manual work before regeneration. Moving shapes changes layout; renaming columns or changing keys changes structure.

See [Linked models and regeneration](regeneration.md) for the workflow.

## Review the final output

Compare SQL with the target engine. For Blueprint, inspect both YAML and generated files. Check model names, existing migrations, authentication tables, and features absent from the diagram.

Practice with a small Customer–Order example in development. Expect a required customer reference on Order, without a requirement that every Customer already has an Order. Continue with [Review SQL output](sql-output.md) or [Blueprint drafts](blueprint-drafts.md).
