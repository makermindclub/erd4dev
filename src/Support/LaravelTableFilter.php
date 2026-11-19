<?php

namespace Makermind\Erd4dev\Support;

/** Identifies framework-managed tables that should not become Blueprint models. */
final class LaravelTableFilter
{
    private const INTERNAL_TABLES = [
        'cache',
        'cache_locks',
        'erd_diagrams',
        'failed_jobs',
        'job_batches',
        'jobs',
        'migrations',
        'password_reset_tokens',
        'personal_access_tokens',
        'sessions',
    ];

    public function isInternal(string $tableName): bool
    {
        $name = strtolower((string) str($tableName)->afterLast('.'));

        // `users` is intentionally editable and exportable. Developers own
        // aligning that table with their application's authentication setup.
        if ($name === 'users') {
            return false;
        }

        $names = self::INTERNAL_TABLES;
        $configuredDiagramTable = config('erd.table', 'erd_diagrams');
        if (is_string($configuredDiagramTable) && $configuredDiagramTable !== '') {
            $names[] = strtolower((string) str($configuredDiagramTable)->afterLast('.'));
        }

        return in_array($name, $names, true);
    }

    public function tables(array $tables): array
    {
        return array_values(array_filter(
            $tables,
            fn (array $table): bool => ! $this->isInternal((string) ($table['name'] ?? '')),
        ));
    }
}
