<?php

namespace Makermind\Erd4dev\Services;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Makermind\Erd4dev\Support\DataTypeCatalog;

/** Translates the guided business rule into the same keys used by SQL and Blueprint. */
final class GuidedRelationshipBuilder
{
    public function apply(RelationalStructureEditor $editor, array $plan, string $dialect): void
    {
        $validator = Validator::make($plan, [
            'name' => 'required|string|max:80',
            'fromTable' => 'required|string', 'toTable' => 'required|string',
            'fromColumns' => 'required|array|min:1|max:32', 'fromColumns.*' => 'present|string',
            'toColumns' => 'required|array|min:1|max:32', 'toColumns.*' => 'required|string|distinct',
            'newColumnNames' => 'present|array|max:32', 'newColumnNames.*' => 'nullable|string|max:80',
            'kind' => 'required|in:many-to-one,one-to-one,many-to-many',
            'optional' => 'required|boolean', 'junctionName' => 'present|nullable|string|max:80',
        ]);
        if ($validator->fails()) {
            throw new InvalidArgumentException($validator->errors()->first());
        }

        // Work on a copy: invalid choices must never leave half a relationship behind.
        $working = new RelationalStructureEditor($editor->tables, $editor->foreignKeys);
        $from = $this->table($working, $plan['fromTable']);
        $to = $this->table($working, $plan['toTable']);
        $targets = $this->columns($to, $plan['toColumns']);
        if (! $this->isUnique($to, array_column($targets, 'name'))) {
            throw new InvalidArgumentException('Choose a complete primary or unique key in the referenced table.');
        }

        if ($plan['kind'] === 'many-to-many') {
            $this->junction($working, $plan, $from, $to, $targets, $dialect);
        } else {
            if (count($plan['fromColumns']) !== count($targets)) {
                throw new InvalidArgumentException('Match one foreign key column to each referenced key column.');
            }
            $sourceIds = [];
            foreach ($targets as $index => $target) {
                $id = $plan['fromColumns'][$index];
                if ($id === '') {
                    $id = $this->copyColumn($working, $from['id'], $plan['newColumnNames'][$index] ?? '', $target, '', $dialect);
                }
                $sourceIds[] = $id;
            }
            $from = $this->table($working, $from['id']);
            $sources = $this->columns($from, $sourceIds);
            $names = array_column($sources, 'name');
            $unique = $this->isUnique($from, $names);
            if ($plan['kind'] === 'many-to-one' && $unique) {
                throw new InvalidArgumentException('These foreign key columns already have PRIMARY or UNIQUE protection. Choose one-to-one, another column, or change that key on the board.');
            }
            if ($plan['optional'] && array_intersect($names, $from['primaryKey']) !== []) {
                throw new InvalidArgumentException('A primary key cannot accept NULL. Use another foreign key column or make this reference required.');
            }
            $tableIndex = array_search($from['id'], array_column($working->tables, 'id'), true);
            if ($plan['kind'] === 'one-to-one' && ! $unique) {
                $working->tables[$tableIndex]['uniqueKeys'][] = $names;
            }
            foreach ($working->tables[$tableIndex]['columns'] as &$column) {
                if (! in_array($column['id'], $sourceIds, true)) {
                    continue;
                }
                $column['nullable'] = (bool) $plan['optional'];
                if ($plan['kind'] === 'one-to-one' && count($sourceIds) === 1 && ! str_contains($column['key'], 'PK') && ! str_contains($column['key'], 'UQ')) {
                    $column['key'] = implode('/', array_filter([$column['key'], 'UQ']));
                }
            }
            unset($column);
            $working->addRelationship($plan['name'], $from['id'], $sourceIds, $to['id'], $plan['toColumns']);
        }
        $editor->tables = $working->tables;
        $editor->foreignKeys = $working->foreignKeys;
    }

    private function junction(RelationalStructureEditor $editor, array $plan, array $from, array $to, array $targets, string $dialect): void
    {
        $sources = $this->columns($from, $plan['fromColumns']);
        if (! $this->isUnique($from, array_column($sources, 'name'))) {
            throw new InvalidArgumentException('Choose a complete primary or unique key for both sides of a many-to-many relationship.');
        }
        $editor->addTable($plan['junctionName'] ?? '', $dialect);
        $index = array_key_last($editor->tables);
        $junctionId = $editor->tables[$index]['id'];
        $editor->tables[$index]['columns'] = [];
        $editor->tables[$index]['primaryKey'] = [];
        $editor->tables[$index]['kind'] = 'associative';
        $leftIds = $rightIds = [];
        $recursive = $from['id'] === $to['id'];
        foreach ($sources as $column) {
            $leftIds[] = $this->copyColumn($editor, $junctionId, ($recursive ? 'left_' : '').Str::snake($from['name']).'_'.$column['name'], $column, 'PK', $dialect);
        }
        foreach ($targets as $column) {
            $rightIds[] = $this->copyColumn($editor, $junctionId, ($recursive ? 'right_' : '').Str::snake($to['name']).'_'.$column['name'], $column, 'PK', $dialect);
        }
        $editor->addRelationship(Str::substr($plan['name'], 0, 74).'_left', $junctionId, $leftIds, $from['id'], $plan['fromColumns']);
        $editor->addRelationship(Str::substr($plan['name'], 0, 74).'_right', $junctionId, $rightIds, $to['id'], $plan['toColumns']);
    }

    private function copyColumn(RelationalStructureEditor $editor, string $tableId, string $name, array $target, string $key, string $dialect): string
    {
        $editor->addColumn($tableId, $name, $target['type'], $key, $dialect);
        $tableIndex = array_search($tableId, array_column($editor->tables, 'id'), true);
        $columnIndex = array_key_last($editor->tables[$tableIndex]['columns']);
        $created = $editor->tables[$tableIndex]['columns'][$columnIndex];
        $definition = array_intersect_key($target, array_flip(['type', 'length', 'precision', 'scale', 'customType', 'enumValues', 'unsigned']));
        $editor->tables[$tableIndex]['columns'][$columnIndex] = DataTypeCatalog::normalize($dialect, array_replace($created, $definition, ['autoIncrement' => false, 'references' => null]));

        return $created['id'];
    }

    private function table(RelationalStructureEditor $editor, string $id): array
    {
        return collect($editor->tables)->firstWhere('id', $id)
            ?? throw new InvalidArgumentException('Choose an existing table.');
    }

    private function columns(array $table, array $ids): array
    {
        if ($ids === [] || count($ids) !== count(array_unique($ids))) {
            throw new InvalidArgumentException('Choose distinct columns for the relationship.');
        }

        return array_map(fn ($id) => collect($table['columns'])->firstWhere('id', $id)
            ?? throw new InvalidArgumentException('Choose an existing column.'), $ids);
    }

    private function isUnique(array $table, array $names): bool
    {
        $keys = [$table['primaryKey'], ...($table['uniqueKeys'] ?? [])];
        foreach ($table['columns'] as $column) {
            if (str_contains($column['key'], 'UQ')) {
                $keys[] = [$column['name']];
            }
        }
        foreach ($keys as $key) {
            if (count($key) === count($names) && array_diff($key, $names) === []) {
                return true;
            }
        }

        return false;
    }
}
