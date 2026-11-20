# ERD4Dev documentation

ERD4Dev is a visual database modeling tool for Laravel. Use the guide to install it, understand the ER model and relational model, model a schema, import an existing structure, and generate outputs for review.

Choose a topic in the sidebar. Each topic is a separate Markdown file, so the documentation can grow without turning into one long page.

## Choose a path

- **First installation:** [Install and open](getting-started.md), then [Editor workflow](modeling.md).
- **Learning database modeling:** [Model stages](concepts.md), [Entities and attributes](entity-relationship.md), [Chen and Crow’s Foot](cardinality.md), then [Relational structure](relational-model.md).
- **Existing database:** [Choose an import](importing.md) and [Database connections](database-connections.md).
- **Preparing implementation:** [Review the model](review.md), [SQL output](sql-output.md), and [Blueprint drafts](blueprint-drafts.md).

> Start with **Install and open** if this is your first time using ERD4Dev.

Prefer watching the real interface? Open [Recorded walkthroughs](recordings.md) for the ER and relational editors, including the More menus.

## What ERD4Dev does

- Builds ER diagrams and linked relational models.
- Imports JSON, SQL, or schema metadata from configured Laravel connections.
- Generates SQL and Laravel Shift Blueprint drafts for review.
- Keeps imported SQL as text and never executes it.

## The learning path

Start with the **entity–relationship model** to describe the domain in plain terms. Use **Crow’s Foot notation** to check cardinality, then move to the **relational model** to verify tables, primary keys, unique constraints, and foreign keys. Finally, compare the result with an existing database connection or export SQL and review the generated output before applying it.

## Project links

- [GitHub repository](https://github.com/makermindclub/erd4dev)
- [Packagist package](https://packagist.org/packages/makermind/erd4dev)
- [Laravel Shift Blueprint documentation](https://blueprint.laravelshift.com/docs/)
