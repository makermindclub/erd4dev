<?php

namespace Makermind\Erd4dev\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Makermind\Erd4dev\Support\DataTypeCatalog;
use Symfony\Component\Yaml\Yaml;

final class BlueprintDraftGenerator
{
    /** @return array{yaml:string,warnings:array} */
    public function generate(array $data, bool $fromEr = false): array
    {
        if ($fromEr) {
            $data = $this->normalizeErNames($data);
        }
        $tables = $data['tables'] ?? [];
        if ($tables === []) {
            throw new InvalidArgumentException('Add a table before generating a draft.');
        }
        // Reuse the board's schema validation; generating SQL here never executes it.
        $sql = new RelationalSqlGenerator;
        $sql->generate($data);
        $models = [];
        $modelNames = [];
        $byId = array_column($tables, null, 'id');
        $warnings = array_values($data['warnings'] ?? []);
        $references = [];
        $dependencies = [];
        $relationshipMethods = [];
        foreach ($sql->foreignKeyGroups($data['foreignKeys'] ?? [], $byId) as $group) {
            $keys = $group['keys'];
            if (count($keys) > 1) {
                $warnings[] = 'Composite FK from '.$byId[$group['fromTable']]['name'].' to '.$byId[$group['toTable']]['name'].' omitted. Add the constraint manually.';

                continue;
            }
            $key = $keys[0];
            $target = $byId[$key['toTable']];
            if (str_contains($target['name'], '.')) {
                $warnings[] = 'FK to qualified table '.$target['name'].' omitted. Add the constraint manually.';

                continue;
            }
            if ($key['fromColumn'] === 'id') {
                $warnings[] = 'FK on '.$byId[$key['fromTable']]['name'].'.id omitted because Blueprint treats id as a special column. Add the constraint manually.';

                continue;
            }
            if (isset($references[$key['fromTable']][$key['fromColumn']])) {
                throw new InvalidArgumentException('Blueprint supports one foreign key per source column.');
            }
            $source = $byId[$key['fromTable']]['name'];
            $method = Str::camel($key['toColumn'] === 'id'
                ? Str::beforeLast($key['fromColumn'], '_id')
                : strtolower(Str::singular($target['name'])));
            if (! preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $method)
                || isset($relationshipMethods[$key['fromTable']][strtolower($method)]) || method_exists(Model::class, $method)) {
                throw new InvalidArgumentException('Blueprint would generate a conflicting relationship method on '.$source.' ('.$method.'). Rename the source column or review the relationship before generating the draft.');
            }
            $relationshipMethods[$key['fromTable']][strtolower($method)] = true;
            if ($key['toColumn'] === 'id' && $key['fromColumn'] !== Str::snake($method).'_id') {
                $warnings[] = 'Set the foreign key explicitly in the Eloquent relationship for '.$source.'.'.$key['fromColumn'].'.';
            }
            $references[$key['fromTable']][$key['fromColumn']] = $target['name'].'.'.$key['toColumn'];
            if ($key['fromTable'] !== $key['toTable']) {
                $dependencies[$key['fromTable']][$key['toTable']] = true;
            }
        }
        foreach ($this->orderTables($byId, $dependencies, $warnings) as $table) {
            $this->identifier($table['name'], true);
            $modelName = Str::studly(Str::singular(str_replace('.', '_', $table['name'])));
            $class = strtolower($modelName);
            if (! preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $modelName)
                || in_array($class, ['int', 'float', 'bool', 'string', 'true', 'false', 'null', 'void', 'iterable', 'object', 'mixed', 'never', 'resource', 'numeric', 'scalar', 'self', 'parent', 'model', 'hasfactory', 'belongsto'], true)
                || token_get_all('<?php '.$modelName)[1][0] !== T_STRING
                || isset($modelNames[$class])) {
                throw new InvalidArgumentException('Table names produce invalid or duplicate model names. Rename the tables on the board.');
            }
            $modelNames[$class] = true;
            $model = ['meta' => ['table' => $table['name']], 'timestamps' => false];
            $columns = $table['columns'] ?? [];
            if ($columns === []) {
                throw new InvalidArgumentException('Table '.$table['name'].' has no columns.');
            }
            if (! in_array('id', array_column($columns, 'name'), true)) {
                $model['id'] = false;
            }
            $primary = $table['primaryKey'] ?? [];
            $hasAutoIncrement = false;
            foreach ($columns as $column) {
                $column = DataTypeCatalog::parseDeclaration($column);
                $this->identifier($column['name']);
                if (in_array(strtolower($column['name']), ['meta', 'timestamps', 'timestampstz', 'softdeletes', 'softdeletestz', 'relationships', 'indexes'], true)) {
                    throw new InvalidArgumentException('Column '.$column['name'].' uses a reserved Blueprint name. Rename it before generating the draft.');
                }
                $definition = $this->columnType($column);
                if (($column['nullable'] ?? false) && ! in_array($column['name'], $primary, true)) {
                    $definition .= ' nullable';
                }
                if ($column['unsigned'] ?? false) {
                    $definition .= ' unsigned';
                }
                if ($column['autoIncrement'] ?? false) {
                    if ($primary !== [$column['name']] || ! in_array($column['type'], ['tinyint', 'smallint', 'integer', 'bigint'], true)) {
                        throw new InvalidArgumentException('Auto-increment on '.$table['name'].'.'.$column['name'].' requires a single integer primary key in Blueprint.');
                    }
                    $definition .= ' autoIncrement';
                    $hasAutoIncrement = true;
                }
                if (isset($references[$table['id']][$column['name']])) {
                    $definition .= ' foreign:'.$references[$table['id']][$column['name']].' onDelete:no_action onUpdate:no_action';
                } elseif ($column['type'] === 'uuid' && str_ends_with($column['name'], '_id')) {
                    $warnings[] = 'Blueprint can infer an Eloquent relationship from '.$table['name'].'.'.$column['name'].' and may add a constraint when use_constraints is enabled. Review the generated files.';
                }
                $model[$column['name']] = $definition;
            }
            $indexes = [];
            if ($primary !== []) {
                if (! $hasAutoIncrement) {
                    $indexes[] = ['primary' => implode(', ', $primary)];
                }
                if (count($primary) > 1) {
                    $warnings[] = 'Composite PK in '.$table['name'].': migration represented; Eloquent does not natively support composite primary keys.';
                } elseif ($primary[0] !== 'id' || ! $hasAutoIncrement) {
                    $warnings[] = 'Review $primaryKey, $keyType and $incrementing on model '.$modelName.' for '.$primary[0].'.';
                }
            } else {
                $warnings[] = 'Table '.$table['name'].' has no primary key: review the Eloquent model configuration.';
            }
            $unique = $table['uniqueKeys'] ?? [];
            foreach ($columns as $column) {
                if (str_contains($column['key'] ?? '', 'UQ') && ! in_array([$column['name']], $unique, true)) {
                    $unique[] = [$column['name']];
                }
            }
            foreach ($unique as $key) {
                if ($key === [] || array_diff($key, array_column($columns, 'name')) !== []) {
                    throw new InvalidArgumentException('Invalid UNIQUE key in table '.$table['name'].'.');
                }
                $indexes[] = ['unique' => implode(', ', $key)];
            }
            if ($indexes !== []) {
                $model['indexes'] = $indexes;
            }
            $models[$modelName] = $model;
        }
        $warnings = array_values(array_unique($warnings));
        $comments = "# Generated by ERD4Dev. Review before running blueprint:build.\n# This draft does not change the database.\n";
        foreach ($warnings as $warning) {
            $comments .= '# WARNING: '.preg_replace('/[\r\n]+/', ' ', $warning)."\n";
        }

        return ['yaml' => $comments.Yaml::dump(['models' => $models], 8, 2), 'warnings' => $warnings];
    }

    private function orderTables(array $tables, array $dependencies, array &$warnings): array
    {
        $ordered = [];
        while ($tables !== []) {
            $ready = array_filter($tables, fn (array $table): bool => array_diff_key($dependencies[$table['id']] ?? [], $ordered) === []);
            if ($ready === []) {
                $warnings[] = 'Circular FKs require manual migration changes on databases that enforce table creation order. Move the circular constraints into a later migration.';

                return $ordered + $tables;
            }
            $ordered += $ready;
            $tables = array_diff_key($tables, $ready);
        }

        return $ordered;
    }

    private function normalizeErNames(array $data): array
    {
        $columns = [];
        foreach ($data['tables'] ?? [] as $index => $table) {
            $name = $table['name'];
            $table['name'] = $this->normalizeErName($name, 'table');
            if ($table['name'] !== $name) {
                $data['warnings'][] = 'ER table '.$name.' is named '.$table['name'].' in the draft.';
            }
            foreach ($table['columns'] as &$column) {
                $original = $column['name'];
                $column['name'] = $this->normalizeErName($original, 'column');
                $columns[$table['id']][$original] = $column['name'];
                if ($column['name'] !== $original) {
                    $data['warnings'][] = 'ER column '.$name.'.'.$original.' is named '.$column['name'].' in the draft.';
                }
            }
            unset($column);
            $rename = fn (string $column): string => $columns[$table['id']][$column] ?? $column;
            $table['primaryKey'] = array_map($rename, $table['primaryKey'] ?? []);
            $table['uniqueKeys'] = array_map(fn (array $key): array => array_map($rename, $key), $table['uniqueKeys'] ?? []);
            $data['tables'][$index] = $table;
        }
        foreach ($data['foreignKeys'] ?? [] as $index => $key) {
            $key['fromColumn'] = $columns[$key['fromTable']][$key['fromColumn']] ?? $key['fromColumn'];
            $key['toColumn'] = $columns[$key['toTable']][$key['toColumn']] ?? $key['toColumn'];
            $data['foreignKeys'][$index] = $key;
        }

        return $data;
    }

    private function normalizeErName(string $name, string $prefix): string
    {
        if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $name)) {
            return $name;
        }

        $normalized = Str::slug(str_replace('.', ' ', $name), '_');
        if ($normalized === '') {
            throw new InvalidArgumentException('The ER name '.$name.' has no usable characters for a Blueprint identifier.');
        }

        return ctype_digit($normalized[0]) ? $prefix.'_'.$normalized : $normalized;
    }

    private function identifier(string $name, bool $qualified = false): void
    {
        $pattern = $qualified ? '/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/D' : '/^[A-Za-z_][A-Za-z0-9_]*$/D';
        if (! preg_match($pattern, $name)) {
            throw new InvalidArgumentException('Blueprint requires simple identifiers. Rename '.$name.' on the board before generating the draft.');
        }
    }

    private function columnType(array $column): string
    {
        $type = $column['type'] ?? 'varchar';
        if ($type === 'enum') {
            $values = $column['enumValues'] ?? [];
            if ($values === []) {
                throw new InvalidArgumentException('The enum has no values. Add values before generating the draft.');
            }
            foreach ($values as $value) {
                // Blueprint writes enum values as JSON inside a PHP array.
                if (preg_match('~[,:/"$\x27\x5c]|[^\x20-\x7e]~', $value)) {
                    throw new InvalidArgumentException('This enum contains characters unsupported by the Blueprint format. Simplify its values on the board.');
                }
            }

            return 'enum:'.implode(',', array_map(fn (string $value): string => '"'.$value.'"', $values));
        }
        $mapped = match ($type) {
            'varchar', 'nvarchar' => 'string', 'nchar' => 'char',
            'tinyint' => 'tinyInteger', 'smallint' => 'smallInteger', 'bigint' => 'bigInteger',
            'numeric' => 'decimal', 'datetime' => 'dateTime',
            'mediumtext' => 'mediumText', 'longtext' => 'longText',
            'blob', 'varbinary' => 'binary',
            'integer', 'decimal', 'float', 'double', 'boolean', 'char', 'text', 'date', 'time', 'timestamp', 'binary', 'uuid', 'json' => $type,
            default => throw new InvalidArgumentException('Type '.$type.' is unsupported in the draft. Choose a compatible type on the board.'),
        };
        if (in_array($mapped, ['string', 'char'], true)) {
            $mapped .= ':'.max(1, (int) ($column['length'] ?? 255));
        } elseif ($mapped === 'decimal') {
            $mapped .= ':'.max(1, (int) ($column['precision'] ?? 10)).','.(int) ($column['scale'] ?? 2);
        } elseif (in_array($type, ['binary', 'varbinary'], true)) {
            $mapped .= ':'.max(1, (int) ($column['length'] ?? ($type === 'binary' ? 1 : 255)));
            if ($type === 'binary') {
                $mapped .= ',true';
            }
        }

        return $mapped;
    }
}
