const snake = value => String(value).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();

export function relationshipGuide() {
    return {
        step: 'rule', appliedFingerprint: '', name: '', left: '', right: '', leftToRight: 'many', rightToLeft: 'one', referenceSide: 'right',
        optional: false, targetKey: '0', leftKey: '0', rightKey: '0', junctionName: '', pairs: [],
        busy: false, error: '', draft: null, success: '',
        init() {
            for (const field of ['left', 'right']) this.$watch(field, () => {
                this.targetKey = this.leftKey = this.rightKey = '0'; this.syncColumns();
            });
            for (const field of ['leftToRight', 'rightToLeft', 'referenceSide', 'targetKey']) this.$watch(field, () => this.syncColumns());
            this.$watch('fingerprint', () => { this.draft = null; this.error = ''; this.success = ''; });
        },
        get tables() { return this.$wire.tables; },
        table(id) { return this.tables.find(table => table.id === id); },
        tableName(id) { return this.table(id)?.name ?? '…'; },
        get ready() { return Boolean(this.left && this.right); },
        get kind() {
            if (this.leftToRight === 'many' && this.rightToLeft === 'many') return 'many-to-many';
            if (this.leftToRight === 'one' && this.rightToLeft === 'one') return 'one-to-one';
            return 'many-to-one';
        },
        get from() {
            if (this.kind === 'many-to-many') return this.left;
            if (this.kind === 'one-to-one') return this.referenceSide === 'left' ? this.left : this.right;
            return this.leftToRight === 'many' ? this.right : this.left;
        },
        get to() { return this.from === this.left ? this.right : this.left; },
        keyOptions(id) {
            const table = this.table(id);
            if (!table) return [];
            const keys = [table.primaryKey ?? [], ...(table.uniqueKeys ?? []), ...table.columns.filter(c => c.key?.includes('UQ')).map(c => [c.name])];
            const seen = new Set();
            return keys.filter(names => {
                const value = [...names].sort().join('\0');
                if (!names.length || seen.has(value) || names.some(name => !table.columns.some(c => c.name === name))) return false;
                seen.add(value); return true;
            }).map(names => ({
                label: names.join(' + ') + (JSON.stringify(names) === JSON.stringify(table.primaryKey) ? ' (PK)' : ' (UNIQUE)'),
                columns: names.map(name => table.columns.find(c => c.name === name)),
            }));
        },
        selectedKey(id, index) { return this.keyOptions(id)[Number(index)]?.columns ?? []; },
        syncColumns() {
            const target = this.table(this.to);
            const source = this.table(this.from);
            const keys = this.selectedKey(this.to, this.targetKey);
            this.pairs = keys.map(column => {
                const prefix = snake(target.name).replace(/s$/, '');
                const suggested = `${prefix}_${column.name}`;
                const existing = source?.columns.find(c => c.name === suggested);
                return { id: column.id, to: column.id, from: existing?.id ?? '', newName: suggested };
            });
        },
        get plan() {
            const many = this.kind === 'many-to-many';
            return {
                name: this.name.trim(), fromTable: this.from, toTable: this.to, kind: this.kind,
                optional: many ? false : this.optional, junctionName: this.junctionName.trim(),
                fromColumns: many ? this.selectedKey(this.left, this.leftKey).map(c => c.id) : this.pairs.map(p => p.from),
                toColumns: many ? this.selectedKey(this.right, this.rightKey).map(c => c.id) : this.pairs.map(p => p.to),
                newColumnNames: many ? [] : this.pairs.map(p => p.newName.trim()),
            };
        },
        get fingerprint() { return JSON.stringify(this.plan); },
        get summary() {
            if (!this.ready) return 'Choose two tables to describe how their records relate.';
            if (this.kind === 'many-to-many') return `A row in “${this.tableName(this.left)}” can relate to many rows in “${this.tableName(this.right)}”, and vice versa.`;
            const source = this.tableName(this.from), target = this.tableName(this.to);
            const count = this.kind === 'one-to-one' ? 'at most one row' : 'many rows';
            return `One row in “${target}” can be referenced by ${count} in “${source}”. Each row in “${source}” ${this.optional ? 'may reference a row' : 'must reference exactly one row'} in “${target}”.`;
        },
        get changes() {
            if (!this.ready) return [];
            if (this.kind === 'many-to-many') {
                const junction = this.junctionName.trim() || '(choose an intermediate table name)';
                return [
                    `Create the intermediate table “${junction}” with two foreign keys, one to each selected key.`,
                    'Copy the referenced key types into the new columns and make them NOT NULL.',
                    'Combine both references into the primary key so the same pair cannot be repeated.',
                    'Either original table can have no links. Each intermediate row requires both references.',
                ];
            }
            const source = this.table(this.from), target = this.table(this.to);
            const changes = this.pairs.map(pair => {
                const column = source?.columns.find(c => c.id === pair.from);
                const key = target?.columns.find(c => c.id === pair.to);
                const name = column?.name ?? pair.newName;
                return `${column ? 'Use' : 'Create'} “${source?.name}.${name}”${column ? '' : ` (${key?.type ?? 'matching key type'})`} to reference “${target?.name}.${key?.name}”.`;
            });
            changes.push(this.optional ? 'Allow NULL in the foreign key: the reference is optional.' : 'Set the foreign key to NOT NULL: the reference is required.');
            changes.push(this.kind === 'one-to-one' ? 'Protect the complete foreign key with UNIQUE: no two rows can reference the same target.' : 'Keep the foreign key non-unique: several rows can reference the same target.');
            return changes;
        },
        get conflict() {
            if (!this.ready) return '';
            if (this.kind === 'many-to-many') {
                if (!this.selectedKey(this.left, this.leftKey).length || !this.selectedKey(this.right, this.rightKey).length) return 'Both tables need a primary or unique key. Set those keys on the board first.';
                return '';
            }
            if (!this.pairs.length) return 'The referenced table needs a primary or unique key. Set a key on the board first.';
            const source = this.table(this.from);
            const selected = this.pairs.map(p => source?.columns.find(c => c.id === p.from)).filter(Boolean);
            if (this.optional && selected.some(c => source.primaryKey.includes(c.name))) return 'A primary key cannot accept NULL. Choose another column or make the reference required.';
            if (selected.some(c => c.references)) return 'One of these columns already has a foreign key. Choose another column or review the existing relationship below.';
            if (this.kind === 'many-to-one' && selected.length === this.pairs.length) {
                const names = selected.map(c => c.name).sort().join('\0');
                if (this.keyOptions(source.id).some(key => key.columns.map(c => c.name).sort().join('\0') === names)) return 'These columns are already unique. Choose one-to-one, another column, or change the key on the board.';
            }
            return '';
        },
        async previewDraft() {
            this.busy = true; this.error = ''; this.draft = null;
            const fingerprint = this.fingerprint;
            try {
                const result = await this.$wire.previewGuidedRelationship(this.plan);
                if (fingerprint !== this.fingerprint) return;
                if (result.ok) this.draft = result;
                else this.error = result.message;
            } catch { this.error = 'Could not preview this relationship. Please try again.'; }
            finally { this.busy = false; }
        },
        async apply() {
            if (this.step !== 'review') { if (this.ready) this.step = 'review'; return; }
            if (this.busy || this.conflict || this.appliedFingerprint === this.fingerprint) return;
            this.busy = true; this.error = ''; this.success = '';
            const fingerprint = this.fingerprint;
            try {
                if (await this.$wire.createGuidedRelationship(this.plan)) {
                    this.draft = null;
                    this.appliedFingerprint = fingerprint;
                    this.success = 'Relationship created. Review its rules under Existing relationships.';
                    this.$nextTick(() => document.getElementById('existing-relationships-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                }
            } catch { this.error = 'Could not create this relationship. Please try again.'; }
            finally { this.busy = false; }
        },
    };
}

if (typeof window !== 'undefined') window.erdRelationshipGuide = relationshipGuide;

/** Open the same explanation from a canvas relationship label, including via keyboard. */
export function installRelationshipHelp(container, wire) {
    if (!container) return () => {};
    function decorate() {
        for (const label of container.querySelectorAll('.flow-edge-label:not(.flow-edge-label-start):not(.flow-edge-label-end)')) {
            label.setAttribute('role', 'button');
            label.setAttribute('tabindex', '0');
            label.setAttribute('aria-label', `Explain relationship ${label.textContent.trim()}`);
            label.setAttribute('title', 'Click to understand this relationship');
        }
    }
    async function open(event) {
        const label = event.target.closest('.flow-edge-label');
        if (!label || !container.contains(label)) return;
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const id = label.dataset.flowEdgeId;
        await wire.openStructureEditor();
        requestAnimationFrame(() => {
            const root = container.closest('.erd-workspace');
            root?.querySelectorAll('.rel-structure-item.is-focused').forEach(el => el.classList.remove('is-focused'));
            const member = [...(root?.querySelectorAll('[data-relationship-member-id]') ?? [])].find(el => el.dataset.relationshipMemberId === id);
            const card = member?.closest('.rel-structure-item') ?? [...(root?.querySelectorAll('[data-relationship-id]') ?? [])].find(el => el.dataset.relationshipId === id);
            card?.classList.add('is-focused');
            card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
    const observer = new MutationObserver(decorate);
    observer.observe(container, { childList: true, subtree: true });
    container.addEventListener('click', open);
    container.addEventListener('keydown', open);
    decorate();
    return () => { observer.disconnect(); container.removeEventListener('click', open); container.removeEventListener('keydown', open); };
}
if (typeof window !== 'undefined') window.installRelationshipHelp = installRelationshipHelp;
