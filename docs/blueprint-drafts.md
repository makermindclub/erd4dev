# Blueprint drafts

A Blueprint draft is a YAML description for [Laravel Shift Blueprint](https://blueprint.laravelshift.com/docs/), which can scaffold application code. ERD4Dev writes the description; running Blueprint is a separate step in the host application.

Use the board tabs to move from a visual model to an output you can review:

- **ER Model** — entities, attributes, and relationships.
- **Relational** — tables, keys, and foreign-key structure.
- **SQL** — generated SQL for review and copying.

## Generate a Blueprint draft

Choose **More → Generate Blueprint draft**. Each click creates a new YAML file in the consuming project's root:

```text
blueprints/draft-{diagram-id}-{YYYYMMDD}-{HHMMSSmicroseconds}.yaml
```

The writer uses exclusive file creation. Existing drafts are never overwritten; if a timestamp collides, a numeric suffix is added. Commit `blueprints/` to version control if the draft is part of the project review.

## Build from the draft

The draft describes the current saved board. It does not generate PHP files, run migrations, or calculate a migration diff automatically. After reviewing the YAML, run Laravel Shift Blueprint from the host application's root:

```bash
php artisan blueprint:build blueprints/draft-42-20261103-123456123456.yaml --only=models,migrations
```

Review the generated files before committing or migrating. Blueprint can overwrite existing model files, including an application's user model. Treat generated migrations as code that still needs review.

## Two different overwrite behaviors

The ERD4Dev draft writer protects existing YAML drafts by creating a new file. That protection does not extend to PHP files produced by Blueprint. A newly named YAML file can still describe a model whose PHP file already exists.

Before building, inspect the repository status and commit or otherwise preserve existing work. After building, inspect the diff for every generated model and migration. Pay particular attention to users, authentication behavior, casts, relationships, and custom model methods.

## A draft is a snapshot, not an upgrade plan

The draft describes the saved board at generation time. Editing the diagram later does not update that YAML. Generate another draft when needed and compare the files.

For an existing database, generated migrations still need a deliberate change strategy. A scaffold does not calculate how to preserve existing data or merge all previous migrations. Test the reviewed changes in development before applying them elsewhere.

## Features that need attention

The draft preserves explicit table names, columns, and keys. Composite foreign keys, schema-qualified references, circular references, nonstandard primary keys, timestamps, and relationship conventions may require manual adjustments. Unsupported types, reserved names, and enums Blueprint cannot represent block generation instead of saving a partial draft.

See the [Laravel Shift Blueprint documentation](https://blueprint.laravelshift.com/docs/) for generator conventions.

Return to [Review the model](review.md) if keys or relationships are still uncertain.

Watch draft generation and the Last draft action in the [Relational More menu recordings](relational-menu.md).
