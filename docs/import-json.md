# JSON structure

Use JSON to move diagrams between ERD4Dev workspaces while retaining structure and layout. Start with **More → JSON export** to obtain a compatible file before building integrations or editing JSON manually.

## Two model shapes

| Field | ER model | Relational model |
| --- | --- | --- |
| dialect | Database dialect | Database dialect |
| entities | Entities and attributes | Not used |
| relations | ER relationships | Not used |
| tables | Not used | Tables, columns, and keys |
| foreignKeys | Not used | References between tables |
| warnings | Not part of this example | Optional review messages |

Keep empty collections as arrays. The importer detects the model from its shape and opens the appropriate board.

## Minimal ER example

```json
{
  "dialect": "mysql",
  "entities": [
    {
      "id": "customer",
      "name": "Customer",
      "x": 120,
      "y": 80,
      "attributes": [
        {"id": "customer-id", "name": "id", "type": "BIGINT", "key": "PK"}
      ]
    }
  ],
  "relations": []
}
```

The internal ID identifies an object in the diagram; the name is its visible name. Coordinates describe layout. Relationships must reference existing object IDs rather than display names.

## Relational JSON

Each table contains columns and key definitions. The top-level foreignKeys list connects those tables and columns. For composite keys and references, start with an editor export containing that pattern so its reference fields remain consistent.

```json
{
  "dialect": "mysql",
  "tables": [
    {
      "id": "customers",
      "name": "customers",
      "x": 120,
      "y": 80,
      "columns": [
        {"id": "customers-id", "name": "id", "type": "BIGINT", "key": "PK", "nullable": false}
      ],
      "primaryKey": ["id"],
      "uniqueKeys": []
    }
  ],
  "foreignKeys": [],
  "warnings": []
}
```

Key lists use column names. A foreign-key entry uses fromTable and toTable for table IDs, and fromColumn and toColumn for column names. Keep these references aligned if you rename or remove a column.

## Validation and limits

Imports are limited to 2 MB, 250 entities or tables, and 500 ER relationships. Invalid references are rejected before project creation. Check JSON syntax, IDs, required arrays, and relationship endpoints when an edited file fails.
