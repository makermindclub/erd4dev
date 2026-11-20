# Entities and attributes

An entity represents a kind of thing, not an individual record. Customer is an entity; a specific customer is an instance. Use singular or plural names consistently so the model stays readable.

## Strong and weak entities

A **strong entity** can be identified by its own key. A customer with a stable customer ID is a typical example.

A **weak entity** depends on an owner for identification. An order line might be identified by its order and a line number together. The line number alone does not identify it across all orders. Review the generated key to ensure the owner reference participates in the identity as intended.

## Simple and composite attributes

A simple attribute stores one fact, such as an email address. A composite attribute groups smaller facts: an address might contain street, city, and postal code. The transformer flattens the simple components into relational columns. Check component names for clarity and collisions.

## Multivalued attributes

A multivalued attribute has several values for one entity, such as a customer's phone numbers. It should not become a comma-separated string in a single column. ERD4Dev creates a separate relational table for multivalued attributes, linked to their owner.

This explains why the relational view can contain more tables than the ER view has entities: extra tables can represent attributes and relationships.

## Identifiers and keys

Use a primary key for identity and a unique key for an additional uniqueness rule. An account ID can be the primary key while an email address has a unique constraint. Nullability is a separate decision: a required attribute must have a value.

Choose identities that remain stable when business data changes. A display name is generally a poor identifier because it can change and need not be unique.

## Exercise: describe a shop

1. Define Customer, Order, and Product entities.
2. Give each a primary key and a small set of attributes.
3. Decide which entity owns each fact: email belongs to Customer; placement date belongs to Order.
4. Add relationships after each entity's meaning is clear.

Continue with [Relationship patterns](relationships.md).
