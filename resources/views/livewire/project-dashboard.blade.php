<main class="erd-dashboard" x-data="{
    pendingProject: null,
    deletingProject: false,
    deleteError: '',
    openDeleteProject(button) {
        this.pendingProject = { id: Number(button.dataset.projectId), name: button.dataset.projectName };
        this.deleteError = '';
        this.$refs.deleteProjectDialog.showModal();
    },
    async confirmProjectDeletion() {
        if (!this.pendingProject || this.deletingProject) return;
        this.deletingProject = true;
        this.deleteError = '';
        try {
            await this.$wire.deleteProject(this.pendingProject.id);
            this.$refs.deleteProjectDialog.close();
            this.$nextTick(() => document.getElementById('project-name')?.focus());
        } catch {
            this.deleteError = 'Could not delete this project. Please try again.';
        } finally {
            this.deletingProject = false;
        }
    },
}">
    <div class="erd-dashboard-shell">
        <div class="erd-dashboard-topbar">
            <a class="erd-dashboard-brand" href="{{ route('erd.dashboard') }}" aria-label="ERD4Dev — projects">
                <svg viewBox="0 0 36 36" aria-hidden="true"><rect x="12" y="2" width="12" height="10" rx="2"/><path d="M18 12v8M8 20h20M8 20v4M28 20v4"/><rect x="2" y="24" width="12" height="10" rx="2"/><rect x="22" y="24" width="12" height="10" rx="2"/></svg>
                <span>ERD<span class="erd-brand-accent">4</span>Dev</span>
            </a>
            <span class="erd-dashboard-topbar-label">MODELING WORKSPACE</span>
            <button type="button"
                x-data="{ dark: document.documentElement.classList.contains('dark') }"
                @erd-theme-changed.window="dark = $event.detail.theme === 'dark'"
                @click="window.setErdTheme(dark ? 'light' : 'dark')"
                :aria-pressed="dark.toString()"
                :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
                class="erd-dashboard-theme">
                <span aria-hidden="true" x-text="dark ? '☀' : '☾'"></span>
                <span x-text="dark ? 'Light theme' : 'Dark theme'"></span>
            </button>
        </div>

        <header class="erd-dashboard-hero">
            <div class="erd-dashboard-intro">
                <p class="erd-dashboard-kicker">FROM IDEA TO STRUCTURE</p>
                <h1>Your next idea.<br><span>Starts here.</span></h1>
                <p class="erd-dashboard-description">Design your entities, connect the relationships, and turn your model into a database structure. Start fresh or pick up where you left off.</p>
                <div class="erd-dashboard-workflow" aria-label="Modeling workflow"><span>ER model</span><span>Relational model</span><span>SQL &amp; Blueprint</span></div>
            </div>

            <div class="erd-dashboard-start">
                <form wire:submit="createProject" class="erd-dashboard-create">
                    <p class="erd-dashboard-kicker">START BUILDING</p>
                    <h2>A place for your idea.</h2>
                    <label for="project-name">Project name</label>
                    <input id="project-name" wire:model="projectName" type="text" placeholder="E.g. library system" maxlength="120">
                    @error('projectName') <p class="erd-dashboard-error" role="alert">{{ $message }}</p> @enderror
                    <button type="submit" class="erd-dashboard-primary" wire:loading.attr="disabled" wire:target="createProject">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        <span wire:loading.remove wire:target="createProject">Create ER model</span>
                        <span wire:loading wire:target="createProject">Creating…</span>
                    </button>
                </form>
                <div class="erd-dashboard-imports">
                    <p>Already have a structure? <span>Import it.</span></p>
                    <div class="erd-dashboard-import-options">
                        <button type="button" wire:click="toggleImport('json')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H6v6l-3 2 3 2v6h2M16 4h2v6l3 2-3 2v6h-2"/></svg>JSON</button>
                        <button type="button" wire:click="toggleImport('sql')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></svg>SQL</button>
                        <button type="button" wire:click="toggleImport('database')"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></svg>Database</button>
                    </div>
                </div>
            </div>
        </header>

        <div
            x-show="$wire.showImport"
            x-cloak
            x-transition.opacity
            x-data="{ readingImportFile: false }"
            class="er-import-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-project-title"
            @click.self="$wire.showImport = false"
            @keydown.escape.window="$wire.showImport = false"
        >
            <div class="er-import-dialog">
                <div class="er-import-heading">
                    <div>
                        <p class="er-import-kicker">New project</p>
                        <h2 id="import-project-title">{{ match ($importFormat) { 'sql' => 'Import SQL schema', 'database' => 'Import database connection', default => 'Import diagram JSON' } }}</h2>
                    </div>
                    <button type="button" wire:click="$set('showImport', false)" aria-label="Close import">✕</button>
                </div>

                <p class="er-import-description">Bring an existing structure into a new project.</p>

                <label class="er-import-field">
                    <span>Project name</span>
                    <input wire:model="importProjectName" type="text" maxlength="120" placeholder="E.g. imported system">
                </label>
                @error('importProjectName') <p class="er-import-error" role="alert">{{ $message }}</p> @enderror

                @if ($importFormat === 'database')
                    <p>Import an editable schema snapshot from a configured Laravel connection. Only metadata is read; editing the board does not change the source database.</p>
                    <label class="er-import-field">
                        <span>Project connection</span>
                        <select wire:model="importConnection" class="rounded-lg border p-2 dark:bg-slate-900">
                            <option value="">Select a connection</option>
                            @foreach ($this->databaseConnections as $name => $driver)
                                <option wire:key="connection-{{ $name }}" value="{{ $name }}">{{ $name }} ({{ $driver }})</option>
                            @endforeach
                        </select>
                    </label>
                    <label class="er-import-toggle">
                        <input type="checkbox" wire:model="hideLaravelTablesOnImport" class="er-import-checkbox">
                        <span>
                            <strong>Hide Laravel internal tables</strong>
                            <small>Keep application tables and hide framework tables such as cache, jobs, and sessions. The users table is always included.</small>
                        </span>
                    </label>
                    <p>Configure the connection and credentials in your Laravel project before importing.</p>
                @elseif ($importFormat === 'sql')
                    <p>Tables, columns and keys are imported as an editable relational model. Data, routines, defaults, checks and generated expressions are omitted. Single and composite PRIMARY, UNIQUE and FOREIGN keys are recognized in CREATE TABLE and ALTER TABLE statements; UNIQUE indexes are also imported.</p>
                    <label class="er-import-drop">
                        <svg class="er-import-drop-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>
                        <span>Select SQL file</span>
                        <small>Maximum 2 MB</small>
                        <input type="file" accept=".sql,text/sql,application/sql,text/plain" aria-label="Project SQL file"
                            @change="
                                const file = $event.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2000000) {
                                    $wire.set('importError', 'The file exceeds the 2 MB limit.');
                                    $event.target.value = '';
                                    return;
                                }
                                readingImportFile = true;
                                $wire.set('importError', '');
                                file.text()
                                    .then(text => $wire.set('importSql', text))
                                    .catch(() => $wire.set('importError', 'Could not read the SQL file.'))
                                    .finally(() => readingImportFile = false);
                            ">
                    </label>
                    <details class="er-import-advanced">
                        <summary>Or paste SQL manually</summary>
                        <textarea wire:model.live.debounce.500ms="importSql" rows="8" placeholder="CREATE TABLE ..." aria-label="SQL to import"></textarea>
                    </details>
                    <p role="status">
                        @if ($this->detectedSqlDialect)
                            Detected database: <strong>{{ \Makermind\Erd4dev\Support\DataTypeCatalog::DIALECTS[$this->detectedSqlDialect]['label'] }}</strong>
                        @else
                            Database not identified. Generic SQL may match multiple databases; select one below.
                        @endif
                    </p>
                    <label class="er-import-field">
                        <span>Database</span>
                        <select wire:model="importDialect" class="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-white">
                            <option value="">Detect automatically</option>
                            @foreach (\Makermind\Erd4dev\Support\DataTypeCatalog::DIALECTS as $value => $config)
                                <option wire:key="dialect-{{ $value }}" value="{{ $value }}">{{ $config['label'] }}</option>
                            @endforeach
                        </select>
                    </label>
                @else
                    <p>Import an ER diagram or a relational model exported as JSON. The format is detected automatically.</p>
                    <label class="er-import-drop">
                        <svg class="er-import-drop-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>
                        <span>Select JSON file</span>
                        <small>Maximum 2 MB</small>
                        <input
                            type="file"
                            accept=".json,application/json"
                            aria-label="Project JSON file"
                            @change="
                                const file = $event.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2000000) {
                                    $wire.set('importError', 'The file exceeds the 2 MB limit.');
                                    $event.target.value = '';
                                    return;
                                }
                                readingImportFile = true;
                                $wire.set('importError', '');
                                file.text()
                                    .then(text => $wire.set('importJson', text))
                                    .catch(() => $wire.set('importError', 'Could not read the JSON file.'))
                                    .finally(() => readingImportFile = false);
                            "
                        >
                    </label>
                    <details class="er-import-advanced">
                        <summary>Or paste JSON manually</summary>
                        <textarea wire:model="importJson" rows="8" placeholder='{"entities":[],"relations":[]}' aria-label="JSON to import"></textarea>
                    </details>

                @endif

                @if ($importError)
                    <p class="er-import-error" role="alert">{{ $importError }}</p>
                @endif

                @if ($importFormat === 'json')
                    <details class="er-import-samples">
                        <summary>Try an example project</summary>
                        <div class="er-import-example">
                            <p>Download a sample JSON to explore:</p>
                            <a href="{{ route('erd.assets', ['file' => 'examples/marketplace-er.json']) }}" download>Marketplace</a>
                            <a href="{{ route('erd.assets', ['file' => 'examples/clinic-er.json']) }}" download>Clinic</a>
                        </div>
                    </details>

                @endif
                <p x-show="readingImportFile" x-cloak class="text-xs text-indigo-700 dark:text-indigo-300" role="status">Reading file…</p>
                <div class="er-import-footer">
                    <button type="button" class="er-import-cancel" wire:click="$set('showImport', false)">Cancel</button>
                    <button type="button" class="er-import-submit" wire:click="{{ match ($importFormat) { 'sql' => 'importSqlProject', 'database' => 'importDatabaseProject', default => 'importProject' } }}" wire:loading.attr="disabled" wire:target="importProject,importSqlProject,importDatabaseProject"
                        :disabled="readingImportFile">
                        <span wire:loading.remove wire:target="importProject,importSqlProject,importDatabaseProject">Create imported project</span>
                        <span wire:loading wire:target="importProject,importSqlProject,importDatabaseProject">Importing…</span>
                    </button>
                </div>
            </div>
        </div>

        <section class="erd-dashboard-projects" aria-labelledby="projects-title">
            <div class="erd-dashboard-projects-heading">
                <div>
                    <p class="erd-dashboard-kicker">KEEP BUILDING</p>
                    <h2 id="projects-title">Your projects<span class="erd-brand-accent">.</span></h2>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-500">ER-to-relational projects and imported relational models.</p>
                </div>
                <span class="erd-project-count">{{ $this->projects->count() }} {{ $this->projects->count() === 1 ? 'project' : 'projects' }}</span>
            </div>

            @if ($this->projects->isEmpty())
                <div class="erd-project-empty">
                    <div class="erd-project-empty-icon">ER</div>
                    <h3 class="mt-5 text-lg font-medium text-slate-950 dark:text-white">Start with a conceptual model</h3>
                    <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-500">Name your project above to start mapping entities and relationships.</p>
                </div>
            @else
                <div class="erd-project-grid">
                    @foreach ($this->projects as $project)
                        <article wire:key="project-{{ $project->id }}" class="erd-project-card">
                            <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10 sm:flex-nowrap">
                                <div class="min-w-0 w-full flex-1 sm:w-auto">
                                    @if ($editingProjectId === $project->id)
                                        <form wire:submit="renameProject" class="space-y-2">
                                            <label for="rename-project-{{ $project->id }}" class="block text-xs font-medium text-slate-700 dark:text-slate-300">Project name</label>
                                            <input id="rename-project-{{ $project->id }}" wire:model="editingProjectName" type="text" maxlength="120"
                                                class="w-full rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400/40 dark:bg-slate-950 dark:text-white">
                                            @error('editingProjectName') <p class="text-xs text-rose-700 dark:text-rose-300" role="alert">{{ $message }}</p> @enderror
                                            <div class="flex gap-2">
                                                <button type="submit" wire:loading.attr="disabled" wire:target="renameProject"
                                                    class="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-60">Save name</button>
                                                <button type="button" wire:click="cancelRename"
                                                    class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                                            </div>
                                        </form>
                                    @else
                                        <h3 class="truncate text-lg font-semibold text-slate-950 dark:text-white">{{ $project->name }}</h3>
                                        <p class="mt-1 text-xs text-slate-600 dark:text-slate-500">Updated {{ $project->updated_at->locale('en')->diffForHumans() }}</p>
                                        @if (\Makermind\Erd4dev\Support\DataTypeCatalog::has($project->data['dialect'] ?? ''))
                                            <p class="mt-2 text-xs font-medium text-cyan-800 dark:text-cyan-300">Database: {{ \Makermind\Erd4dev\Support\DataTypeCatalog::DIALECTS[$project->data['dialect']]['label'] }}</p>
                                        @endif
                                    @endif
                                </div>
                                <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
                                    @if ($editingProjectId !== $project->id)
                                        <button type="button" wire:click="startRename({{ $project->id }})"
                                            aria-label="Rename project {{ $project->name }}" title="Rename project"
                                            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-white/15 dark:text-slate-300 dark:hover:border-indigo-300/40 dark:hover:text-indigo-200">
                                            Rename
                                        </button>
                                    @endif
                                    <button
                                        type="button"
                                        data-project-id="{{ $project->id }}"
                                        data-project-name="{{ $project->name }}"
                                        @click="openDeleteProject($el)"
                                        aria-label="Delete project {{ $project->name }}"
                                        title="Delete project"
                                        class="grid size-8 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50 dark:border-rose-400/15 dark:bg-rose-400/5 dark:text-rose-300 dark:hover:border-rose-300/35 dark:hover:bg-rose-400/15"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>
                                    </button>
                                </div>
                            </div>

                            @if ($project->type === \Makermind\Erd4dev\Models\Diagram::TYPE_RELATIONAL)
                                <div class="p-5">
                                    <a wire:navigate href="{{ route('erd.boards.relational', $project) }}" class="erd-project-model">
                                        <strong class="block text-base">Relational model</strong>
                                        <span class="mt-1 block text-sm">{{ ($project->data['origin']['type'] ?? 'sql') === 'database' ? 'Imported from database' : 'Imported from SQL' }} · independent editing · no ER model</span>
                                        <span class="mt-5 block text-sm font-medium text-cyan-800 dark:text-cyan-300">Open board</span>
                                    </a>
                                </div>
                            @else
                            <div class="grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                                <a wire:navigate href="{{ route('erd.boards.er', $project) }}" class="erd-project-model">
                                    <span class="text-xs font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Step 1</span>
                                    <strong class="mt-6 block text-base text-slate-950 dark:text-white">ER model</strong>
                                    <span class="mt-1 block text-sm text-slate-600 dark:text-slate-400">Entities, attributes and relationships</span>
                                    <span class="mt-5 block text-sm font-medium text-indigo-700 dark:text-indigo-300">Open board</span>
                                </a>

                                <div class="hidden items-center text-slate-400 dark:text-slate-700 sm:flex">→</div>

                                @if ($project->relationalDiagram)
                                    <a wire:navigate href="{{ route('erd.boards.relational', $project->relationalDiagram) }}" class="erd-project-model">
                                        <span class="text-xs font-semibold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">Step 2</span>
                                        @if (in_array($project->id, $this->outdatedRelational, true))
                                            <span class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
                                                title="The ER model changed after the last generation. Regenerate from the relational board.">
                                                <span aria-hidden="true">!</span> Outdated
                                            </span>
                                        @endif
                                        <strong class="mt-6 block text-base text-slate-950 dark:text-white">Relational model</strong>
                                        <span class="mt-1 block text-sm text-slate-600 dark:text-slate-400">Linked to ER model</span>
                                        <span class="mt-5 block text-sm font-medium text-cyan-800 dark:text-cyan-300">Open board</span>
                                    </a>
                                @else
                                    <button wire:click="createRelational({{ $project->id }})" wire:loading.attr="disabled" wire:target="createRelational({{ $project->id }})"
                                        class="erd-project-model erd-project-model-pending">
                                        <span class="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">Step 2</span>
                                        <strong class="mt-6 block text-base text-slate-800 dark:text-slate-200">Create relational model</strong>
                                        <span class="mt-1 block text-sm text-slate-600 dark:text-slate-500">Available from this ER model</span>
                                        <span class="mt-5 block text-sm font-medium text-cyan-800 dark:text-cyan-300">Continue project</span>
                                    </button>
                                @endif
                            </div>
                            @endif
                        </article>
                    @endforeach
                </div>
            @endif
        </section>
    </div>
    <dialog x-ref="deleteProjectDialog" wire:ignore.self class="erd-project-delete-modal"
        aria-labelledby="delete-project-title" aria-describedby="delete-project-description"
        @close="pendingProject = null; deleteError = ''"
        @cancel="if (deletingProject) $event.preventDefault()"
        @click="if (!deletingProject) $el.close()">
        <form @submit.prevent="confirmProjectDeletion()" @click.stop class="erd-project-delete-content">
            <span class="erd-project-delete-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg></span>
            <h2 id="delete-project-title">Delete this project?</h2>
            <p id="delete-project-description">You’re about to delete <strong x-text="pendingProject?.name"></strong> and all its models. This action cannot be undone.</p>
            <p x-show="deleteError" x-text="deleteError" class="erd-dashboard-error" role="alert"></p>
            <div class="erd-project-delete-actions">
                <button type="button" autofocus :disabled="deletingProject" @click="$refs.deleteProjectDialog.close()">Cancel</button>
                <button type="submit" class="erd-project-delete-confirm" :disabled="deletingProject">
                    <span x-text="deletingProject ? 'Deleting…' : 'Delete project'"></span>
                </button>
            </div>
        </form>
    </dialog>
</main>
