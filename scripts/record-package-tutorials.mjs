// Records the running Laravel package with Chromium's native video capture.
// No simulated interface, injected cursor, or reconstructed frames are used.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/record-package-tutorials.mjs
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PACKAGE_URL || 'http://127.0.0.1:8080';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use an isolated local demo: recording creates sample projects.');
const output = 'assets/tutorials';
const raw = await mkdtemp(join(tmpdir(), 'erd4dev-captures-'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const viewport = { width: 1280, height: 800 };
const pause = (page, duration = 1000) => page.waitForTimeout(duration);
const more = async (page, label) => {
  await page.locator('.board-toolbar-menu > summary').click();
  await pause(page, 700);
  const item = page.locator('.board-menu-panel').getByText(label, { exact: true });
  if (['Arrange', 'Save'].includes(label) && !(await item.isVisible())) {
    await page.locator('.board-toolbar-menu > summary').click();
    await page.locator('.board-toolbar-actions > button').getByText(label, { exact: true }).first().click();
  } else await item.click();
  await pause(page);
};
const entity = async (page, name) => {
  await page.locator('#new-entity-name').pressSequentially(name, { delay: 90 });
  await page.locator('.board-create-form button').click();
  await pause(page, 650);
};
const attribute = async (page, entityName, name) => {
  const node = page.locator('.er-node').filter({ has: page.getByRole('button', { name: `Rename entity ${entityName}`, exact: true }) });
  await node.locator('.er-add-toggle').click();
  await node.locator('.er-add-input').click();
  await node.locator('.er-add-input').fill(name);
  await pause(page, 350);
  await node.locator('.er-add-input').press('Enter');
  await node.getByRole('textbox', { name: `Attribute name ${name}`, exact: true }).waitFor();
  await pause(page, 650);
};
const newEr = async (page) => {
  await page.goto(`${base}/erd`);
  await page.locator('#project-name').fill('Tutorial — Customer orders');
  await page.getByRole('button', { name: 'Create ER', exact: true }).click();
  await page.waitForURL('**/boards/er/**');
  await pause(page, 700);
};
const sampleEr = async (page) => {
  await newEr(page);
  await entity(page, 'customers');
  await attribute(page, 'customers', 'email');
  await entity(page, 'orders');
  await attribute(page, 'orders', 'ordered_at');
  const heads = page.locator('.er-head');
  const from = await heads.nth(1).boundingBox();
  const to = await heads.nth(0).boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(from.x + from.width / 2, from.y + 12);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + 12, { steps: 35 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.getByText('relaciona', { exact: true }).waitFor();
  await page.locator('[data-board-save]').click();
  await pause(page);
};
const linked = async (page) => {
  await sampleEr(page);
  await page.getByRole('button', { name: 'Relational model', exact: true }).click();
  await page.waitForURL('**/boards/relational/**');
  await pause(page, 700);
  await page.getByRole('button', {name:'Arrange',exact:true}).first().click();
  await pause(page, 700);
};
const sql = 'CREATE TABLE customers (id BIGINT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE);\nCREATE TABLE orders (id BIGINT PRIMARY KEY, customer_id BIGINT NOT NULL, FOREIGN KEY (customer_id) REFERENCES customers(id));\nCREATE TABLE cache (key VARCHAR(255) PRIMARY KEY, value TEXT);';
const independent = async (page) => {
  await page.goto(`${base}/erd`);
  await page.getByRole('button', { name: /Import SQL project/ }).click();
  await page.locator('input[wire\\:model="importProjectName"]').fill('Tutorial — Imported shop');
  await page.getByText('Or paste SQL manually', { exact: true }).click();
  await page.getByRole('textbox', { name: 'SQL to import' }).fill(sql);
  await page.locator('select[wire\\:model="importDialect"]').selectOption('mysql');
  await pause(page, 700);
  await page.locator('.er-import-dialog').getByRole('button', { name: 'Create imported project', exact: true }).click();
  await page.waitForURL('**/boards/relational/**');
  await pause(page, 700);
};
const databaseSnapshot = async (page) => {
  await page.goto(`${base}/erd`);
  await page.getByRole('button',{name:'Import database connection',exact:true}).click();
  await page.locator('input[wire\\:model="importProjectName"]').fill('Tutorial — Laravel database snapshot');
  await page.locator('select[wire\\:model="importConnection"]').selectOption('sqlite');
  await page.locator('input[wire\\:model="hideLaravelTablesOnImport"]').uncheck();
  await page.getByRole('button',{name:'Create imported project',exact:true}).click();
  await page.waitForURL('**/boards/relational/**'); await pause(page,1000);
};
const clips = [
  ['er-modeling', newEr, async page => {
    await entity(page, 'customers'); await attribute(page, 'customers', 'email');
    await entity(page, 'orders'); await attribute(page, 'orders', 'ordered_at');
    await page.getByRole('button', { name: 'Arrange', exact: true }).first().click();
    await pause(page); await page.locator('[data-board-save]').click(); await pause(page, 1600);
  }],
  ['er-relationships', sampleEr, async page => {
    const label = await page.getByText('relaciona', { exact: true }).boundingBox();
    await page.mouse.click(label.x + label.width / 2, label.y + label.height / 2);
    await page.locator('#relation-name-editor').fill('places');
    await page.locator('.er-ee-rename button').click(); await pause(page);
    await page.locator('.er-ee-end').first().getByTitle('zero or many', { exact: true }).click(); await pause(page);
    await page.getByRole('tab', { name: /Attributes/ }).click();
    await page.getByRole('textbox', { name: 'Attribute name', exact: true }).fill('reference');
    await page.locator('.er-ee-add-attribute button').click(); await pause(page, 1400);
    await page.locator('.er-ee-close').click(); await page.locator('[data-board-save]').click(); await pause(page);
  }],
  ['er-more', sampleEr, async page => {
    await more(page, 'Model guide'); await pause(page, 1500); await page.getByRole('button', {name:'Close guide', exact:true}).click();
    await more(page, 'View JSON'); await pause(page, 1400); await page.getByRole('button', {name:'Close JSON',exact:true}).click();
    await more(page, 'Dark theme'); await pause(page, 1500); await more(page, 'Light theme');
    await more(page, 'Arrange'); await more(page, 'Save');
  }],
  ['er-exports', sampleEr, async page => {
    for (const label of ['Download high-resolution PNG', 'Download JPG']) {
      const download = page.waitForEvent('download'); await more(page, label); const file = await download;
      console.log('Downloaded', file.suggestedFilename()); await pause(page, 1500);
    }
    await more(page, 'View JSON'); const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .json', exact: true }).click(); await download; await pause(page);
    await page.getByRole('button', { name: 'Close JSON', exact: true }).click();
  }],
  ['er-conversion', sampleEr, async page => {
    await more(page, 'Convert to relational'); await page.waitForURL('**/boards/relational/**'); await pause(page, 900);
    await page.getByRole('button',{name:'Arrange',exact:true}).first().click(); await pause(page, 1200);
    await more(page, 'Model guide'); await pause(page, 2000);
  }],
  ['relational-sql', linked, async page => {
    await page.getByRole('combobox', { name: 'Target database' }).selectOption('pgsql'); await pause(page, 1200);
    await more(page, 'Generate SQL'); await pause(page, 1800);
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download .sql', exact:true }).click(); await download;
    await pause(page); await page.getByRole('button', { name:'Close SQL',exact:true }).click();
    await more(page, 'View JSON'); await pause(page, 1400); await page.getByRole('button', {name:'Close JSON',exact:true}).click();
  }],
  ['relational-blueprint', linked, async page => {
    await more(page, 'Generate Blueprint draft');
    await page.getByText('Blueprint draft generated',{exact:true}).waitFor();
    await pause(page, 2200); await page.getByRole('button', {name:'Copy command',exact:true}).click(); await pause(page);
    await page.getByRole('button', {name:'Close draft notification',exact:true}).click();
    await more(page, 'Last draft'); await pause(page, 1800);
  }],
  ['relational-editing', independent, async page => {
    await page.getByRole('button',{name:'New table',exact:true}).first().click();
    await page.getByRole('textbox',{name:'New table name'}).pressSequentially('payments',{delay:100});
    await page.getByRole('button',{name:'Create table',exact:true}).click(); await pause(page, 1400);
    const table = page.locator('.rel-node').last();
    await table.getByRole('textbox',{name:'New column name'}).fill('order_id');
    await table.getByRole('button',{name:'Add column',exact:true}).click(); await pause(page);
    const column = table.locator('.rel-column').last();
    await column.getByRole('combobox',{name:'Column type',exact:true}).selectOption('bigint'); await pause(page);
    await page.getByRole('button',{name:'Relationships',exact:true}).first().click(); await pause(page, 2200);
    await page.getByRole('textbox',{name:'New relationship name'}).fill('payment_order');
    await page.getByRole('combobox',{name:'FK source table',exact:true}).selectOption({label:'payments'});
    await page.getByRole('combobox',{name:'Referenced table',exact:true}).selectOption({label:'orders'});
    await page.getByRole('combobox',{name:'FK source column',exact:true}).selectOption({label:'order_id'});
    await page.getByRole('combobox',{name:'Referenced column',exact:true}).selectOption({label:'id'});
    await page.getByRole('button',{name:'Add relationship',exact:true}).click(); await pause(page,1600);
    await page.getByRole('button',{name:'Close relationships',exact:true}).click();
    await page.locator('[data-board-save]').click(); await pause(page);
  }],
  ['relational-filter', databaseSnapshot, async page => {
    await more(page, 'Hide Laravel tables'); await pause(page, 1600);
    await more(page, 'Generate SQL'); await pause(page, 1400); await page.getByRole('button',{name:'Close SQL',exact:true}).click();
    await more(page, 'Show Laravel tables'); await pause(page, 1600);
    await more(page, 'Model guide'); await pause(page, 1500);
  }],
  ['relational-regeneration', linked, async page => {
    await page.getByRole('link',{name:'ER model',exact:true}).click(); await page.waitForURL('**/boards/er/**');
    await attribute(page,'customers','phone'); await page.locator('[data-board-save]').click(); await pause(page);
    await page.getByRole('button',{name:/Relational model/}).first().click(); await page.waitForURL('**/boards/relational/**'); await pause(page,1300);
    await page.locator('.rel-drift summary').click(); await pause(page,1800);
    await more(page,'Regenerate from ER'); await pause(page,1000);
    await page.getByRole('button',{name:'Arrange',exact:true}).first().click(); await pause(page,1500);
  }],
  ['relational-exports', independent, async page => {
    await more(page,'Arrange'); await more(page,'Save');
    for (const label of ['Download high-resolution PNG','Download JPG']) {
      const download = page.waitForEvent('download'); await more(page,label); await download; await pause(page);
    }
    await more(page,'Dark theme'); await pause(page,1300); await more(page,'Light theme');
    await more(page,'View JSON'); const download = page.waitForEvent('download');
    await page.getByRole('button',{name:'Download .json',exact:true}).click(); await download; await pause(page);
    await page.getByRole('button',{name:'Close JSON',exact:true}).click();
    await page.locator('.board-toolbar-menu > summary').click(); await pause(page,900);
    await page.getByRole('link',{name:'Back to projects',exact:true}).click(); await page.waitForURL('**/erd'); await pause(page);
  }],
];
const chosen = process.env.CLIPS?.split(',');
const manifest = [];
try {
  for (const [name, setup, actions] of clips) {
    if (chosen && !chosen.includes(name)) continue;
    const context = await browser.newContext({ viewport, recordVideo: { dir: raw, size: viewport }, acceptDownloads: true });
    const page = await context.newPage();
    const epoch = Date.now();
    page.setDefaultTimeout(12000);
    page.on('dialog', async dialog => { await pause(page,1000); await dialog.accept(); });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await setup(page);
      const start = (Date.now() - epoch) / 1000;
      console.log('Recording', name, page.url());
      await actions(page); await pause(page,700);
      await page.screenshot({path:join(raw,`${name}-final.png`)});
      const video = page.video(); await context.close();
      const input = await video.path();
      const gif = `${output}/${name}.gif`;
      const result = spawnSync('ffmpeg', ['-v','error','-ss',String(start),'-i',input,'-filter_complex','fps=10,scale=1120:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0','-y',gif], {encoding:'utf8'});
      if (result.status !== 0) throw new Error(result.stderr);
      manifest.push({ name, gif, sourceVideo: input, errors });
      console.log('Saved', gif, errors.length ? errors : 'no browser errors');
    } catch (error) {
      await page.screenshot({path:join(raw,`${name}-error.png`)}).catch(()=>{});
      console.error('Recording failed:',name,'Evidence:',raw); throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); await writeFile(join(raw,'manifest.json'),JSON.stringify(manifest,null,2)); console.log('Raw captures:',raw); }
