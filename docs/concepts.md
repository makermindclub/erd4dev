# Conceptual, logical, and physical models

Each modeling stage answers a different question. Start with the domain, organize it into relational structure, then review its implementation for the chosen database. ERD4Dev connects these stages through its ER, Relational, and SQL views.

## Conceptual: describe the domain

An **entity–relationship model** describes what matters in the product. Customer, Order, and Product are entities; their attributes describe facts; relationships express how they connect. Ask what an instance means and which business rules apply.

The ER editor already accepts practical details such as types and keys. It supports conceptual reasoning while preparing for implementation, rather than being a strictly database-independent drawing.

## Read the drawing

The ER view combines Chen relationship diamonds with Crow’s Foot cardinality markers. These conventions describe different things: the relationship's name and each end's allowed participation. Learn them in [Chen and Crow’s Foot](cardinality.md).

## Logical: organize tables and constraints

The **relational model** turns the domain into tables, columns, keys, and foreign keys. Entities become tables; attributes become columns; an entity identifier becomes a primary key; and relationships become foreign-key constraints.

This is the bridge between domain discussion and implementation. Review identity, nullability, composite keys, and uniqueness. Extra tables may express associations or multivalued attributes. See [Tables, keys, and constraints](relational-model.md).

## Physical: implement for an engine

SQL adds concrete types and syntax for the selected engine. The same logical model may require different definitions in MySQL, PostgreSQL, SQLite, or SQL Server. Review the dialect and constraints before applying generated output.

When the database already exists, [Database connections](database-connections.md) explains how to capture its schema as an independent relational snapshot. It does not synchronize diagram edits back to the database.

## A practical sequence

1. Start with entities and relationships in **ER Model**.
2. Use Crow’s Foot cardinality to check whether each connection is optional, required, one, or many.
3. Review the generated **Relational** view for tables, keys, and foreign keys.
4. Compare with a real database connection or imported SQL when integrating with an existing schema.
5. Generate SQL or a Blueprint draft only after the model has been reviewed.

## Follow the same example across stages

| Stage | Question | Customer and order example |
| --- | --- | --- |
| Conceptual | What does the domain say? | A customer places orders |
| Logical | Which structure expresses it? | Order has a customer reference |
| Physical | How does the engine implement it? | SQL defines a compatible foreign key |

Continue with [Entities and attributes](entity-relationship.md).
