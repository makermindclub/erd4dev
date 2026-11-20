# Import JSON, SQL, or database metadata

The dashboard can create a project from an exported JSON file, SQL text, or the schema metadata of a configured Laravel database connection.

## Choose your starting point

| You have | Use | Result |
| --- | --- | --- |
| An exported diagram | JSON | ER or relational board, detected from structure |
| Table definitions | SQL import | Independent relational board |
| A running database | Database metadata | Independent relational snapshot |

For a new domain, start with the ER editor instead. Importing a physical schema does not reconstruct all the original conceptual decisions.

The detailed guides cover [JSON structure](import-json.md), [SQL files and dialects](import-sql.md), and [Database connections](database-connections.md).

## JSON files

ERD4Dev detects the model from the top-level keys:

- An ER model contains `dialect`, `entities`, and `relations`.
- A relational model contains `dialect`, `tables`, and `foreignKeys`.
- Optional `warnings` are preserved on relational imports.

A small ER example looks like this:

```json
{
  "dialect": "mysql",
  "entities": [
    {
      "id": "user",
      "name": "User",
      "x": 120,
      "y": 80,
      "attributes": [
        {"id": "user-id", "name": "id", "type": "BIGINT", "key": "PK"}
      ]
    }
  ],
  "relations": []
}
```

The editor's **More → JSON export** is the safest way to produce a compatible file. Imports are limited to 2 MB, with limits of 250 entities/tables and 500 ER relationships.

## SQL import

Paste table definitions or upload SQL text. ERD4Dev detects SQLite, MySQL/MariaDB, PostgreSQL, SQL Server, and Oracle-style SQL where supported. SQL is parsed as text and never executed. Remove routines and `DELIMITER` blocks before importing when the parser reports them as unsupported.

## Database import

Database import reads schema metadata from connections configured in `config/database.php`. It does not read application rows, and passwords are not entered in the browser. SQLite, MySQL/MariaDB, PostgreSQL, and SQL Server are supported for metadata import; Oracle is supported through SQL import rather than connection import.

Use **Hide Laravel internal tables** when you want to focus on application tables. The filter preserves `users`. A snapshot changes only the saved diagram, never the source database.

## After any import

Inspect names, types, primary and unique keys, and foreign-key targets. Read warnings before exporting again: the diagram may represent less than the original engine schema. Keep source files when they contain features outside the diagram. Continue with [Review the model](review.md).
