<?php

namespace Makermind\Erd4dev\Tests;

use ArtisanFlow\WireFlow\WireFlowServiceProvider;
use Blueprint\Blueprint;
use Blueprint\BlueprintServiceProvider;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Livewire\Livewire;
use Livewire\LivewireServiceProvider;
use Makermind\Erd4dev\ErdServiceProvider;
use Makermind\Erd4dev\Livewire\ProjectDashboard;
use Makermind\Erd4dev\Livewire\RelationalBoard;
use Makermind\Erd4dev\Models\Diagram;
use Makermind\Erd4dev\Services\BlueprintDraftGenerator;
use Makermind\Erd4dev\Services\ErToRelationalTransformer;
use Makermind\Erd4dev\Services\RelationalColumnUpdater;
use Makermind\Erd4dev\Support\DatabaseDiagramImporter;
use Makermind\Erd4dev\Support\ErDiagramImporter;
use Makermind\Erd4dev\Support\SqlDiagramImporter;
use Orchestra\Testbench\TestCase;

class PackageIntegrationTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [LivewireServiceProvider::class, WireFlowServiceProvider::class, BlueprintServiceProvider::class, ErdServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true,
        ]);
        $app['config']->set('session.driver', 'array');
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
    }

    protected function setUp(): void
    {
        parent::setUp();
        (require __DIR__.'/../database/migrations/2026_01_01_000000_create_erd_diagrams_table.php')->up();
    }

    public function test_access_is_denied_until_host_grants_permission(): void
    {
        $this->get('/erd')->assertForbidden();
        $this->get('/erd/schema')->assertForbidden();
    }

    public function test_blueprint_parses_imported_keys_and_column_attributes(): void
    {
        $data = (new SqlDiagramImporter)->parse(<<<'SQL'
            CREATE TABLE order_lines (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                order_number VARCHAR(20) NOT NULL REFERENCES orders (number),
                state ENUM('', '0', 'in review'),
                signature BINARY(16)
            );
            CREATE TABLE orders (number VARCHAR(20) PRIMARY KEY, UNIQUE (number));
            SQL, 'mysql')['relational'];

        $draft = (new BlueprintDraftGenerator)->generate($data);
        $blueprint = $this->app->make(Blueprint::class);
        $models = $blueprint->analyze($blueprint->parse($draft['yaml'], false))->models();

        $this->assertSame(['Order', 'OrderLine'], array_keys($models));
        $columns = $models['OrderLine']->columns();
        $this->assertContains('unsigned', $columns['id']->modifiers());
        $this->assertContains('autoIncrement', $columns['id']->modifiers());
        $this->assertSame('orders.number', $columns['order_number']->isForeignKey());
        $this->assertSame(['', '0', 'in review'], $columns['state']->attributes());
        $this->assertSame(['16', 'true'], $columns['signature']->attributes());
    }

    public function test_er_example_draft_preserves_column_sizes_after_board_normalization(): void
    {
        $example = file_get_contents(__DIR__.'/../resources/examples/marketplace-er.json');
        $diagram = ErDiagramImporter::parse($example);
        $address = array_search('addresses', array_column($diagram['entities'], 'id'), true);
        $diagram['entities'][$address]['name'] = 'Delivery Address';
        $data = (new ErToRelationalTransformer)->transform($diagram);
        $data['tables'] = (new RelationalColumnUpdater)->dialect($data['tables'], $data['dialect']);
        $draft = (new BlueprintDraftGenerator)->generate($data, fromEr: true);

        $this->assertStringContainsString('table: delivery_address', $draft['yaml']);
        $this->assertStringContainsString('decimal:10,2', $draft['yaml']);
        $this->assertStringContainsString('ER table Delivery Address is named delivery_address', $draft['yaml']);
        $this->assertContains('Delivery Address', array_column($data['tables'], 'name'));
    }

    public function test_sqlite_snapshot_does_not_turn_a_partial_index_into_an_unconditional_unique_key(): void
    {
        DB::statement('CREATE TABLE contacts (id INTEGER PRIMARY KEY, email TEXT, deleted_at TEXT)');
        DB::statement('CREATE UNIQUE INDEX contacts_email_active ON contacts (email) WHERE deleted_at IS NULL');

        $data = (new DatabaseDiagramImporter)->import('testing');
        $contacts = collect($data['tables'])->firstWhere('name', 'contacts');

        $this->assertSame([], $contacts['uniqueKeys']);
        $this->assertContains('Partial UNIQUE index contacts_email_active on contacts was omitted.', $data['warnings']);
    }

    public function test_panel_uses_package_views_and_precompiled_assets(): void
    {
        Gate::define('erd.access', fn ($user = null) => true);

        $this->get('/erd')->assertOk()
            ->assertSee('/erd/assets/erd.css', false)
            ->assertSee('/erd/assets/erd.js', false)
            ->assertDontSee('@vite', false);
        $this->get('/erd/schema')->assertOk()->assertSee('flow-container');
        $this->assertTrue(config('livewire.inject_assets'));
        $this->assertTrue(Schema::hasTable('erd_diagrams'));
        $this->assertFalse(Schema::hasTable('diagrams'));
    }

    public function test_create_and_open_diagram_without_demo_application(): void
    {
        Gate::define('erd.access', fn ($user = null) => true);

        Livewire::test(ProjectDashboard::class)
            ->set('projectName', 'Package project')
            ->call('createProject')
            ->assertHasNoErrors();

        $diagram = Diagram::sole();
        $this->assertSame('Package project', $diagram->name);
        $this->get(route('erd.boards.er', $diagram))->assertOk();
    }

    public function test_relational_link_and_cascade_use_package_table(): void
    {
        $source = Diagram::create(['name' => 'ER', 'type' => 1, 'data' => []]);
        $relational = Diagram::create([
            'name' => 'Relational', 'type' => 2, 'data' => [], 'source_diagram_id' => $source->id,
        ]);
        $this->assertTrue($source->relationalDiagram->is($relational));
        $source->delete();
        $this->assertSame(0, Diagram::count());
    }

    public function test_json_import_preserves_relational_models_and_supports_export_round_trips(): void
    {
        Gate::define('erd.access', fn ($user = null) => true);
        $json = file_get_contents(__DIR__.'/Fixtures/relational-model.json');
        $data = json_decode($json, true);
        unset($data['_comment']);

        Livewire::test(ProjectDashboard::class)
            ->set('importJson', '{invalid')
            ->call('importProject')
            ->set('importJson', $json)
            ->call('importProject')
            ->assertSet('importError', '')
            ->assertRedirect(route('erd.boards.relational', Diagram::sole()));

        $diagram = Diagram::sole();
        $this->assertSame(Diagram::TYPE_RELATIONAL, $diagram->type);
        $this->assertNull($diagram->source_diagram_id);
        $this->assertSame($data, $diagram->data);

        $board = Livewire::test(RelationalBoard::class, ['diagram' => $diagram])
            ->assertSet('tables', $data['tables'])
            ->assertSet('foreignKeys', $data['foreignKeys'])
            ->call('openSqlPreview')
            ->assertSet('sqlError', null);

        Livewire::test(ProjectDashboard::class)
            ->set('importJson', $board->instance()->getJsonPreviewProperty())
            ->call('importProject')
            ->assertRedirect();
        $this->assertSame($data, Diagram::latest('id')->first()->data);
    }

    public function test_invalid_relational_json_does_not_create_diagrams(): void
    {
        Gate::define('erd.access', fn ($user = null) => true);
        $data = json_decode(file_get_contents(__DIR__.'/Fixtures/relational-model.json'), true);
        $data['foreignKeys'][0]['toTable'] = 'missing';
        Livewire::test(ProjectDashboard::class)
            ->set('importJson', json_encode($data))
            ->call('importProject')
            ->assertSet('importError', 'A foreign key references a missing table or column.');
        $this->assertSame(0, Diagram::count());

        $data['tables'][0]['columns'] = 'invalid';
        Livewire::test(ProjectDashboard::class)
            ->set('importJson', json_encode($data))
            ->call('importProject')
            ->assertNoRedirect();
        $this->assertSame(0, Diagram::count());
    }

    public function test_json_import_still_accepts_er_diagrams(): void
    {
        Gate::define('erd.access', fn ($user = null) => true);
        $json = file_get_contents(__DIR__.'/../resources/examples/er-conversion-cases.json');

        Livewire::test(ProjectDashboard::class)
            ->set('importProjectName', 'Imported ER')
            ->set('importJson', $json)
            ->call('importProject')
            ->assertRedirect(route('erd.boards.er', Diagram::sole()));

        $this->assertSame(Diagram::TYPE_ENTITY_RELATIONSHIP, Diagram::sole()->type);
        $this->assertCount(40, Diagram::sole()->data['relations']);
    }

    public function test_livewire_updates_recheck_access_after_permission_is_revoked(): void
    {
        $allowed = true;
        Gate::define('erd.access', function ($user = null) use (&$allowed): bool {
            return $allowed;
        });
        $response = $this->get('/erd')->assertOk();
        preg_match('/wire:snapshot="([^"]+)"/', $response->getContent(), $matches);
        $this->assertNotEmpty($matches);
        $allowed = false;

        $this->postJson('/erd/update', [
            '_token' => csrf_token(),
            'components' => [[
                'snapshot' => html_entity_decode($matches[1], ENT_QUOTES),
                'updates' => ['projectName' => 'Forbidden project'],
                'calls' => [['method' => 'createProject', 'params' => [], 'path' => '']],
            ]],
        ], ['X-Livewire' => 'true'])->assertForbidden();
        $this->assertSame(0, Diagram::count());
    }

    public function test_local_environment_can_create_a_project_without_login(): void
    {
        $this->app['env'] = 'local';
        Schema::dropIfExists('erd_diagrams');
        $response = $this->get('/erd')->assertOk();
        preg_match('/wire:snapshot="([^"]+)"/', $response->getContent(), $matches);
        $this->postJson('/erd/update', [
            '_token' => csrf_token(),
            'components' => [[
                'snapshot' => html_entity_decode($matches[1], ENT_QUOTES),
                'updates' => ['projectName' => 'Local project'],
                'calls' => [['method' => 'createProject', 'params' => [], 'path' => '']],
            ]],
        ], ['X-Livewire' => 'true'])->assertOk();
        $this->assertSame('Local project', Diagram::sole()->name);
        (require __DIR__.'/../database/migrations/2026_01_01_000000_create_erd_diagrams_table.php')->up();
        $this->get('/erd')->assertOk();
        $this->assertSame('Local project', Diagram::sole()->name);
    }

    public function test_assets_are_available_without_publishing_and_paths_are_restricted(): void
    {
        $this->app['env'] = 'local';
        foreach (['erd.js', 'erd.css', 'livewire.js', 'examples/clinic-er.json'] as $file) {
            $this->get('/erd/assets/'.$file)->assertOk();
        }
        $this->get('/erd/assets/composer.json')->assertNotFound();
        $this->get('/erd/assets/../composer.json')->assertNotFound();
    }

    public function test_host_routes_and_livewire_endpoint_are_preserved(): void
    {
        $this->app['env'] = 'local';
        Route::get('/', fn () => 'Host home');
        Route::get('/schema', fn () => 'Host schema');
        $uri = Livewire::getUpdateUri();
        $response = $this->get('/erd')->assertOk()->assertSee('/erd/update', false);
        preg_match('/wire:snapshot="([^"]+)"/', $response->getContent(), $matches);
        $this->get('/')->assertSee('Host home');
        $this->get('/schema')->assertSee('Host schema');
        $this->assertSame($uri, Livewire::getUpdateUri());
        $this->postJson($uri, ['_token' => csrf_token(), 'components' => [[
            'snapshot' => html_entity_decode($matches[1], ENT_QUOTES), 'updates' => [], 'calls' => [],
        ]]], ['X-Livewire' => 'true'])->assertOk();
        foreach (Route::getRoutes() as $route) {
            if (str_starts_with($route->getName() ?? '', 'erd.')) {
                $this->assertStringStartsWith('erd', $route->uri());
            }
        }
    }

    public function test_installer_publishes_assets_and_an_idempotent_runnable_migration(): void
    {
        $migration = database_path('migrations/2026_01_01_000000_create_erd_diagrams_table.php');
        $this->assertFileDoesNotExist($migration);
        $assets = public_path('vendor/erd');
        $this->assertDirectoryDoesNotExist($assets);
        try {
            $this->artisan('erd:install')->assertSuccessful();
            $this->artisan('erd:install')->assertSuccessful();
            $this->assertFileExists($migration);
            $this->assertFileExists($assets.'/erd.js');
            $this->assertFileExists($assets.'/erd.css');
            $this->assertFileExists($assets.'/examples/er-conversion-cases.json');
            Schema::dropIfExists('erd_diagrams');
            $this->artisan('migrate', ['--path' => $migration, '--realpath' => true])
                ->assertSuccessful();
            $this->assertTrue(Schema::hasTable('erd_diagrams'));
        } finally {
            if (is_file($migration)) {
                unlink($migration);
            }
            (new Filesystem)->deleteDirectory($assets);
        }
    }

    public function test_package_views_can_be_cached(): void
    {
        $this->artisan('view:cache')->assertSuccessful();
        $this->artisan('view:clear')->assertSuccessful();
    }
}
