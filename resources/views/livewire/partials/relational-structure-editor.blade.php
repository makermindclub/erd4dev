<div x-show="$wire.showStructureEditor" x-cloak class="rel-modal" role="dialog" aria-modal="true" aria-labelledby="structure-title"
    @click.self="$wire.showStructureEditor = false" @keydown.escape.window="$wire.showStructureEditor = false">
    <div class="rel-modal-card rel-structure-editor">
        <header>
            <div><p class="board-dialog-kicker">CONNECT YOUR DATA</p><h2 id="structure-title">Relationships</h2></div>
            <button type="button" wire:click="$set('showStructureEditor', false)" aria-label="Close relationships">✕</button>
        </header>
        <div class="rel-structure-body">
            @if ($sourceDiagramId === null)
                <p class="rel-structure-intro">Describe the rule first. Review the columns and constraints before applying it.</p>
                <form wire:key="guided-relationship-form" x-data="window.erdRelationshipGuide()" @submit.prevent="apply()"
                    @relational-edit-rejected.window="error = $event.detail.message" class="rel-relationship-create">
                    <fieldset class="rel-guide-fields" :disabled="busy">
                    <div class="rel-guide-step-heading"><h3 x-text="step === 'rule' ? 'Describe the relationship' : 'Review before creating'"></h3><button type="button" x-show="step === 'review'" @click="step = 'rule'">Edit answers</button></div>
                    <div x-show="step === 'rule'" class="rel-guide-rule-step">
                    <div class="rel-relationship-tables">
                        <label class="rel-relationship-field"><span>First table</span>
                            <select x-model="left" required aria-label="First table"><option value="">Choose a table</option>
                                @foreach ($tables as $table)<option wire:key="guide-left-{{ $table['id'] }}" value="{{ $table['id'] }}">{{ $table['name'] }}</option>@endforeach
                            </select>
                        </label>
                        <label class="rel-relationship-field"><span>Second table</span>
                            <select x-model="right" required aria-label="Second table"><option value="">Choose a table</option>
                                @foreach ($tables as $table)<option wire:key="guide-right-{{ $table['id'] }}" value="{{ $table['id'] }}">{{ $table['name'] }}</option>@endforeach
                            </select>
                        </label>
                    </div>
                    <div x-show="ready" class="rel-guide-questions">
                        <label class="rel-relationship-field"><span>For one record in <strong x-text="tableName(left)"></strong>, how many records in <strong x-text="tableName(right)"></strong> can be related?</span>
                            <select x-model="leftToRight" aria-label="Second-table records per first-table record"><option value="one">At most one</option><option value="many">Several</option></select>
                        </label>
                        <label class="rel-relationship-field"><span>For one record in <strong x-text="tableName(right)"></strong>, how many records in <strong x-text="tableName(left)"></strong> can be related?</span>
                            <select x-model="rightToLeft" aria-label="First-table records per second-table record"><option value="one">At most one</option><option value="many">Several</option></select>
                        </label>
                        <label x-show="kind === 'one-to-one'" class="rel-relationship-field"><span>Which table should store the foreign key?</span>
                            <select x-model="referenceSide" aria-label="Table storing the foreign key"><option value="left" x-text="tableName(left)"></option><option value="right" x-text="tableName(right)"></option></select>
                        </label>
                        <label x-show="kind !== 'many-to-many'" class="rel-relationship-field"><span>Can a record in <strong x-text="tableName(from)"></strong> exist without a reference to <strong x-text="tableName(to)"></strong>?</span>
                            <select x-model.boolean="optional" aria-label="Is the reference optional?"><option value="false">No — a reference is required</option><option value="true">Yes — a reference is optional</option></select>
                        </label>
                    </div>
                    </div>
                    <div class="rel-guide-summary" aria-live="polite"><span class="board-dialog-kicker">YOUR RULE</span><p x-text="summary"></p></div>
                    <button type="button" x-show="step === 'rule'" class="board-action-primary" :disabled="!ready" @click="step = 'review'">Review the changes</button>
                    <div x-show="step === 'review'" class="rel-guide-review-step">
                    <label class="rel-relationship-field"><span>Relationship name</span><input x-model="name" :disabled="step !== 'review'" required maxlength="80" placeholder="E.g. orders_customer" aria-label="New relationship name"></label>
                    <div x-show="ready">
                        <template x-if="kind === 'many-to-many'">
                            <div class="rel-guide-junction">
                                <label class="rel-relationship-field"><span>Intermediate table name</span><input x-model="junctionName" :disabled="step !== 'review'" required maxlength="80" placeholder="E.g. customer_orders" aria-label="Intermediate table name"></label>
                                <p class="rel-structure-help">A many-to-many rule needs an intermediate table. Each row connects one record from each side.</p>
                                <div class="rel-relationship-tables">
                                    <label class="rel-relationship-field"><span>Key in <strong x-text="tableName(left)"></strong></span><select x-model="leftKey" aria-label="First-table key"><template x-for="(key, index) in keyOptions(left)" :key="key.label"><option :value="String(index)" x-text="key.label"></option></template></select></label>
                                    <label class="rel-relationship-field"><span>Key in <strong x-text="tableName(right)"></strong></span><select x-model="rightKey" aria-label="Second-table key"><template x-for="(key, index) in keyOptions(right)" :key="key.label"><option :value="String(index)" x-text="key.label"></option></template></select></label>
                                </div>
                            </div>
                        </template>
                        <template x-if="kind !== 'many-to-many'">
                            <details wire:ignore.self class="rel-guide-columns">
                                <summary>Choose the columns</summary>
                                <p class="rel-structure-help">The foreign key will be stored in <strong x-text="tableName(from)"></strong>, referencing a key in <strong x-text="tableName(to)"></strong>.</p>
                                <label class="rel-relationship-field"><span>Referenced key</span><select x-model="targetKey" aria-label="Referenced key"><template x-for="(key, index) in keyOptions(to)" :key="key.label"><option :value="String(index)" x-text="key.label"></option></template></select></label>
                                <template x-for="pair in pairs" :key="pair.id">
                                    <div class="rel-guide-column-pair">
                                        <label class="rel-relationship-field"><span>Column in <strong x-text="tableName(from)"></strong></span><select x-model="pair.from" aria-label="Foreign key column"><option value="">Create a new column</option><template x-for="column in (table(from)?.columns ?? [])" :key="column.id"><option :value="column.id" x-text="column.name"></option></template></select></label>
                                        <label x-show="pair.from === ''" class="rel-relationship-field"><span>New column name</span><input x-model="pair.newName" :required="pair.from === ''" maxlength="80" aria-label="New foreign key column name"></label>
                                        <p class="rel-structure-help">References <code x-text="tableName(to) + '.' + (table(to)?.columns.find(c => c.id === pair.to)?.name ?? '')"></code>.</p>
                                    </div>
                                </template>
                            </details>
                        </template>
                    </div>
                    <div x-show="ready" class="rel-guide-preview">
                        <h4>What will change in the model</h4>
                        <ul><template x-for="change in changes" :key="change"><li x-text="change"></li></template></ul>
                        <p class="rel-structure-help">These changes affect this diagram. They do not alter your connected database. Requiring a parent record to have children needs an additional business rule.</p>
                    </div>
                    <p x-show="conflict" x-text="conflict" class="rel-guide-error" role="status"></p>
                    <p x-show="error" x-text="error" class="rel-guide-error" role="alert"></p>
                    <p x-show="success" x-text="success" class="rel-guide-success" role="status"></p>
                    <details wire:ignore.self x-show="ready" class="rel-guide-blueprint">
                        <summary>See how this becomes a Blueprint draft</summary>
                        <p class="rel-structure-help">Preview the actual generated YAML before applying. No draft file is written, and nothing is saved.</p>
                        <button type="button" class="board-toolbar-button" @click="previewDraft()" :disabled="busy || !!conflict || !name.trim()">Preview Blueprint</button>
                        <template x-if="draft"><div><pre x-text="draft.yaml"></pre><ul class="rel-guide-draft-warnings"><template x-for="warning in draft.warnings" :key="warning"><li x-text="warning"></li></template></ul></div></template>
                        <p class="rel-structure-help">The draft describes keys and columns. Review its warnings and Eloquent relationships before running Blueprint.</p>
                    </details>
                    <div class="rel-relationship-footer"><p>Review the rule and its database constraints, then apply them together.</p><button type="submit" class="board-action-primary" :disabled="busy || !ready || !!conflict || appliedFingerprint === fingerprint"><span x-text="busy ? 'Working…' : 'Create relationship'"></span></button></div>
                    </div>
                    </fieldset>
                </form>
            @else
                <div class="rel-guide-origin"><strong>This model is linked to an ER diagram.</strong><p>These relationships were generated from its entities and cardinalities. Make structural changes in the ER source, then regenerate this model.</p><a wire:navigate href="{{ route('erd.boards.er', $sourceDiagramId) }}">Open ER source</a></div>
            @endif

            <section class="rel-relationship-existing" aria-labelledby="existing-relationships-title">
                <h3 id="existing-relationships-title">Existing relationships</h3>
                @php($seenRelationships = [])
                @forelse ($foreignKeys as $key)
                    @php($group = json_encode([$key['fromTable'], $key['toTable'], $key['relationshipName'] ?? $key['id']]))
                    @continue(in_array($group, $seenRelationships, true))
                    @php($seenRelationships[] = $group)
                    <div wire:key="structure-relationship-{{ $key['id'] }}" class="rel-structure-item" data-relationship-id="{{ $key['id'] }}">
                        <div class="rel-existing-heading"><strong>{{ collect($tables)->firstWhere('id', $key['fromTable'])['name'] }} <span aria-hidden="true">→</span> {{ collect($tables)->firstWhere('id', $key['toTable'])['name'] }}</strong><span class="rel-existing-cardinality">{{ $key['cardinality'] ?? 'N:1' }}</span></div>
                        @php($fromName = collect($tables)->firstWhere('id', $key['fromTable'])['name'])
                        @php($toName = collect($tables)->firstWhere('id', $key['toTable'])['name'])
                        <div class="rel-existing-explanation"><p>Each record in <strong>{{ $fromName }}</strong> {{ ($key['targetCard'] ?? '') === 'cf-zero-one' ? 'may reference a record' : 'must reference one record' }} in <strong>{{ $toName }}</strong>.</p><p>One record in <strong>{{ $toName }}</strong> can be referenced by {{ ($key['cardinality'] ?? 'N:1') === '1:1' ? 'at most one record' : 'several records' }} in <strong>{{ $fromName }}</strong>.</p></div>
                        @if ((collect($tables)->firstWhere('id', $key['fromTable'])['kind'] ?? '') === 'associative')
                            <p class="rel-structure-help">This intermediate table connects records through separate foreign keys. Together, those links can represent a many-to-many relationship.</p>
                        @endif
                        <div class="rel-existing-columns">
                            @foreach ($foreignKeys as $member)
                                @if ($member['id'] === $key['id'] || (!empty($key['relationshipName']) && $member['fromTable'] === $key['fromTable'] && $member['toTable'] === $key['toTable'] && ($member['relationshipName'] ?? '') === $key['relationshipName']))
                                    <span data-relationship-member-id="{{ $member['id'] }}" wire:key="relationship-member-{{ $key['id'] }}-{{ $member['id'] }}"><code>{{ $member['fromColumn'] }}</code> references <code>{{ $member['toColumn'] }}</code></span>
                                @endif
                            @endforeach
                        </div>
                        @if ($sourceDiagramId === null)
                        <form x-data="{ name: @js($key['relationshipName'] ?? '') }" @submit.prevent="$wire.renameRelationship(@js($key['id']), name)" class="rel-structure-row">
                            <label class="rel-relationship-field"><span>Relationship name</span><input x-model="name" required maxlength="80" aria-label="Relationship name"></label>
                            <button type="submit" wire:loading.attr="disabled">Rename relationship</button>
                            <button type="button" class="is-danger" wire:click="deleteRelationship(@js($key['id']))"
                                wire:confirm="Remove this relationship? Its columns will be kept." wire:loading.attr="disabled">Remove relationship</button>
                        </form>
                        @endif
                    </div>
                @empty
                    <p class="rel-relationship-empty">No foreign keys are defined in this model yet.</p>
                @endforelse
            </section>
        </div>
    </div>
</div>
