# Install and open

ERD4Dev runs inside the Laravel application that hosts it.

## Requirements

- PHP 8.3 or newer
- Laravel 12 or newer
- Livewire 4.3 or newer

## Install

Run this in the host application's root:

```bash
composer require --dev makermind/erd4dev getartisanflow/wireflow:0.2.4-alpha
```

The WireFlow alpha version must be accepted explicitly. Laravel package discovery registers ERD4Dev automatically.

## Open the editor

Open `/erd` on the same host and port as the Laravel application. For example:

```text
http://localhost:8000/erd
```

In local development, no login is required. The package creates its diagram storage table on the first request when needed. It uses the application's configured database; that database must already exist and be reachable.

## Optional installation command

`erd:install` can publish compiled assets and the package migration. Its `--migrate` option runs **all pending application migrations**, so review that command before using it in an existing application.

## Choose your first workflow

For a new design, read [Conceptual, logical, and physical models](concepts.md), then follow [Editor workflow](modeling.md). For an existing schema, use [Choose an import](importing.md).

Start with a small diagram before importing a large schema. Confirm you can create a project, reopen it, and export JSON. This verifies diagram storage and gives you a sample file to keep.
