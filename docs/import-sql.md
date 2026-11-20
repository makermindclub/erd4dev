# SQL files and dialects

Use SQL import for table definitions or a schema-only database export. Paste SQL or upload a file through the dashboard import flow. The parser builds an independent relational board; it never executes the imported SQL.

## Prepare the input

Start with CREATE TABLE definitions and their keys. Data-loading statements and routines are not substitutes for schema definitions. Remove routines and DELIMITER blocks from the import copy if the parser reports them as unsupported.

## Dialect support

The importer recognizes SQLite, MySQL/MariaDB, PostgreSQL, SQL Server, and Oracle-style SQL where supported. Recognition does not imply that every engine feature can be represented in a diagram. Confirm the detected dialect, inspect types, and read warnings.

## Small example

```sql
CREATE TABLE customers (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

After import, inspect both tables, email uniqueness, and the required customer reference. Application rows are not needed to explain this structure.

## Verify the result

Compare the board with the original definitions. Do not assume defaults, checks, views, routines, ordinary indexes, collations, or referential actions survive a diagram round trip. Keep the original schema when it uses features outside the representation.

Continue with [Review SQL output](sql-output.md).
