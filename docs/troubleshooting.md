# Troubleshooting

Begin with the stage that failed: application startup, import, transformation, or generation. A connection error and a diagram validation error require different checks.

## The editor does not open

Verify the package is installed in the Laravel application serving the URL, then visit **/erd** on that host and port. Check version requirements and application logs. The diagram storage database must exist and be reachable.

Outside local development, check the host application's **erd.access** Gate and user permissions. The package does not create an account system.

## Connection missing or metadata import fails

Check Laravel connection configuration, supported drivers, credentials, network access, and schema inspection permissions. Review configuration caching after changing environment values. An empty schema or more than 250 tables can also prevent import.

See [Database connections](database-connections.md).

## JSON or SQL rejected

For JSON, check file size, top-level arrays, IDs, and relationship references. Compare with a fresh editor export. For SQL, start with table definitions and read errors about unsupported statements or dialect features.

## Unexpected generated tables

Check cardinality on both ends. Many-to-many relationships and multivalued attributes intentionally create extra tables. Review keys, nullability, warnings, and whether the linked ER source changed after generation.

## Blueprint generation stops

Read reported unsupported types, reserved names, or enum definitions. Unsupported cases block generation rather than saving a partial draft. Building PHP files from successful YAML is a separate Blueprint operation.

## Existing files changed after building

Inspect the version-control diff before migrating. The draft writer protects existing YAML files, but Blueprint can overwrite PHP models. Restore or merge affected files through your normal version-control workflow, then review the draft before another build.
