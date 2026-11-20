# Database connections

Database import creates a schema snapshot from a connection configured in the Laravel application. Use it to document an existing database, inspect keys, or begin a review from the current schema.

## Storage versus source connection

The application's storage database holds saved diagram records. The connection selected for import is the schema you want to inspect. These can be different connections. Saving a diagram stores its representation; it does not apply its structure to the imported database.

## Configure the host application

Laravel owns the credentials and connection settings in **config/database.php**, usually through environment variables. ERD4Dev lists supported configured connections; passwords are not entered in its browser interface.

A dedicated MySQL connection can look like this inside the connections array:

```php
'diagram_source' => [
    'driver' => 'mysql',
    'host' => env('DIAGRAM_DB_HOST', '127.0.0.1'),
    'port' => env('DIAGRAM_DB_PORT', '3306'),
    'database' => env('DIAGRAM_DB_DATABASE'),
    'username' => env('DIAGRAM_DB_USERNAME'),
    'password' => env('DIAGRAM_DB_PASSWORD'),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
],
```

Adapt it to your actual engine and configuration. Set values on the server and give the connection account permission to inspect schema metadata.

## Import a snapshot

1. Open the dashboard database import flow.
2. Select the configured connection.
3. Decide whether to hide Laravel internal tables.
4. Import the snapshot and read its warnings.
5. Check tables, key columns, and foreign-key endpoints.

Metadata import supports SQLite, MySQL/MariaDB, PostgreSQL, and SQL Server, with a limit of 250 tables. Use SQL import for Oracle-style definitions.

## What is captured

Snapshots contain tables, columns, primary keys, unique keys, and foreign keys. They do not read application rows. Data, defaults, checks, views, triggers, ordinary indexes, collations, and ON DELETE or ON UPDATE actions are outside the representation.

A snapshot is not a live synchronized view. Editing it does not change source tables or records. Re-import when you need a new capture of the source schema.

## Laravel table filtering

The import filter can omit framework tables and preserves users. In a database-origin relational snapshot, **More → Hide Laravel tables** also controls SQL and JSON exports when recognized internal tables are present. It does not appear on ordinary SQL imports in this package version. Tables excluded at import are not restored by the board visibility toggle. Blueprint drafts omit Laravel internals regardless of that preference, while keeping users. Review users against the application's authentication schema.

Watch the filter in use in [Relational: More menu](relational-menu.md).
