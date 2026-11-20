# Relationship patterns

A relationship expresses a business rule. The participating entities, their roles, and the cardinality affect its relational result. Draw the rule, then inspect the generated tables and constraints.

## One-to-many

A customer can place many orders; each order belongs to one customer. The generated reference belongs on Order. Optional participation controls whether that reference may be NULL.

## One-to-one

An account and a profile may have a one-to-one relationship. The generated reference needs uniqueness to prevent several profiles from referencing the same account. Check which table receives the reference and whether participation is optional.

## Many-to-many and association attributes

An order contains many products, and a product can appear in many orders. ERD4Dev creates an associative table for that many-to-many relationship. Quantity ordered belongs to the association, rather than to Product.

Distinguish a product's current price from the unit price recorded when it was ordered. They describe different facts. Review the associative table's keys and attributes to ensure it preserves that distinction.

## Recursive relationships

An employee can report to another employee. Both ends refer to Employee, so role names such as manager and report clarify their meaning. Recursive one-to-one and many-to-many patterns may need an additional generated table; inspect the result rather than assuming every self-relationship becomes one column.

## Several participants

A relationship can involve more than two participants. A supplier providing a product to a warehouse describes a combination of three roles. Splitting that fact into independent pairs can lose meaning. Review the table produced for the complete relationship and all warnings.

## Before generating outputs

Read every relationship in both directions, identify optional ends, and confirm where relationship attributes belong. Continue with [Review the model](review.md).
