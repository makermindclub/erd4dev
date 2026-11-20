# Chen and Crow’s Foot

The ER editor combines two conventions: a central diamond for a relationship, from **Chen notation**, and **Crow’s Foot** markers at entity ends. The diamond names the relationship; the end markers describe how many instances may participate.

## Read the four cardinalities

| Marker concept | Range | Meaning |
| --- | --- | --- |
| Circle and bar | 0..1 | Optional, at most one |
| Two bars | 1..1 | Exactly one |
| Circle and crow’s foot | 0..many | Optional, any number |
| Bar and crow’s foot | 1..many | At least one |

Read each end independently. The marker next to Order tells you how many orders relate to one customer. The marker next to Customer tells you how many customers relate to one order.

## Example: customer places order

Every order must have one customer, while a new customer may have no orders. The Customer end is exactly one and the Order end is zero or many.

```text
Customer [exactly one] ---- places ---- [zero or many] Order
```

The relational model places the customer reference on Order. A required foreign key ensures an order has a customer. It does not require every customer to have an order.

## Minimum participation is a separate rule

Maximum cardinality limits how many; a minimum of zero makes participation optional. A unique foreign key can limit a reference to one; a nullable foreign key can make that reference optional.

Some rules require more than foreign keys. Requiring every parent to have at least one child generally needs application logic or additional database validation. Read transformation warnings instead of assuming every marker becomes a complete SQL constraint.

## Check the meaning before export

Say the rule aloud in both directions: “An order belongs to exactly one customer” and “A customer may place zero or many orders.” If the sentences disagree with the markers, fix cardinality before generating output.

Continue with [Tables, keys, and constraints](relational-model.md).
