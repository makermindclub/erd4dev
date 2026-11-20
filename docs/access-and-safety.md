# Access and safety

ERD4Dev is a shared workspace. It does not provide user accounts, registration, or per-user or tenant ownership.

## Local development

With `APP_ENV=local`, the editor does not require a login. Use it with a local database that already exists and is reachable.

## Other environments

Outside local development, define the host application's `erd.access` Gate:

```php
use Illuminate\Support\Facades\Gate;

Gate::define('erd.access', fn ($user) => $user->can('manage-diagrams'));
```

The host application owns the permission. ERD4Dev checks authorization again during Livewire updates.

## Important safety rules

- Imported SQL is never executed.
- Database imports read metadata, not application rows.
- Drafts contain the saved board without credentials or database records.
- Generated SQL and Blueprint files are outputs for review, not automatic migrations.
- Keep `blueprints/` under version control and inspect generated files before running commands.

## Diagram storage and database snapshots

Saved projects use the host application's configured storage database. A database import may inspect a different configured connection. The saved snapshot and the original source schema have separate lifecycles: changing the diagram does not apply a migration to that source.

Diagram exports can contain schema names and business structure even though they exclude application rows and credentials. Share them according to the host project's access practices.

## Protect work at each stage

Use JSON to preserve a diagram before regeneration, version control to preserve application code before Blueprint builds, and the application's migration process to apply reviewed database changes. These protect different artifacts; preserving a YAML file does not protect an existing PHP model from a later build.

See [Troubleshooting](troubleshooting.md) for startup, permissions, import, and generation issues.
