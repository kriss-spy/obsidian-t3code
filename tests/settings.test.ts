import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import type T3Plugin from '../src/main';
import type { SettingsTab } from '../src/settings';
import type { App, PluginManifest } from 'obsidian';

const nativeRequire = createRequire(import.meta.url);
const bundles = ['src/main.ts', 'src/settings.ts'].map(entry => buildSync({
  entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['obsidian', 'electron'],
}).outputFiles[0].text);

function fixture() {
  const notices: string[] = [];
  class PluginSettingTab { update() {} }
  const obsidian = { Plugin: class {}, PluginSettingTab, ItemView: class {}, FileSystemAdapter: class {},
    Notice: class { constructor(message: string) { notices.push(message); } } };
  const load = (bundle: string) => {
    const module = { exports: {} as any };
    new Function('require', 'module', 'exports', bundle)(
      (name: string) => name === 'obsidian' ? obsidian : nativeRequire(name), module, module.exports);
    return module.exports;
  };
  const plugin: T3Plugin = new (load(bundles[0]).default)({} as App, {} as PluginManifest);
  const owner = {} as Document;
  const connections: string[] = [];
  const leaves: any[] = [];
  const revealed: any[] = [];
  const saved: unknown[] = [];
  const workspace = {
    getMostRecentLeaf: () => ({ view: { containerEl: { ownerDocument: owner } } }),
    getLeavesOfType: () => leaves,
    getLeaf: () => {
      const view = { containerEl: { ownerDocument: owner }, route: '/draft/old',
        resetTarget() { this.route = '/'; },
        async connect() { connections.push(plugin.settings.origin); plugin.diagnostic = 'T3 descriptor unavailable.'; },
      };
      const leaf = { view, async setViewState() { leaves.push(leaf); await view.connect(); } };
      return leaf;
    },
    revealLeaf: async (leaf: unknown) => { revealed.push(leaf); },
    setActiveLeaf: () => {},
  };
  Object.defineProperty(plugin, 'app', { value: { workspace } });
  plugin.saveData = async data => { saved.push(data); };
  const tab: SettingsTab = new (load(bundles[1]).SettingsTab)(plugin);
  const button = { text: '', disabled: false, click: async () => {},
    setButtonText(value: string) { this.text = value; return this; },
    setDisabled(value: boolean) { this.disabled = value; return this; },
    onClick(callback: () => Promise<void>) { this.click = callback; return this; },
  };
  let change = (_value: string) => {};
  const text = { setValue: (_value: string) => text, onChange(callback: typeof change) { change = callback; return text; } };
  const definition = tab.getSettingDefinitions().find(item => 'name' in item && item.name === 'T3 server');
  assert.ok(definition && 'render' in definition && definition.render);
  definition.render({
    addText: (render: (text: any) => void) => render(text),
    addButton: (render: (button: any) => void) => render(button),
  } as any, {} as any);
  return { plugin, tab, button, notices, connections, leaves, revealed, saved, change: (value: string) => change(value) };
}

test('Connect from settings creates a workspace and attempts a connection when no tab is open', async () => {
  const f = fixture();
  f.change('http://127.0.0.1:3774');
  await f.button.click();
  assert.deepEqual(f.connections, ['http://127.0.0.1:3774']);
  assert.equal(f.leaves.length, 1);
  assert.deepEqual(f.revealed, f.leaves);
  assert.equal((f.saved[0] as { origin: string }).origin, 'http://127.0.0.1:3774');
  assert.equal(f.plugin.diagnostic, 'T3 descriptor unavailable.');
  assert.ok(f.notices.includes('T3 descriptor unavailable.'));
});

test('component buttons switch between download and delete and block concurrent operations', async () => {
  const f = fixture();
  const actions: string[] = [];
  f.plugin.downloadComponents = async kind => { actions.push('download ' + kind); };
  f.plugin.deleteComponents = async kind => { actions.push('delete ' + kind); };
  const render = (name: string) => {
    const definition = f.tab.getSettingDefinitions().find(item => 'name' in item && item.name === name);
    assert.ok(definition && 'render' in definition && definition.render);
    definition.render({addButton: (callback: (button: any) => void) => callback(f.button), setDesc: () => {}} as any, {} as any);
    return f.button;
  };
  assert.equal(render('Necessary files').text, 'Download necessary files');
  await f.button.click();
  assert.equal(render('Extra fonts').text, 'Download extra fonts');
  await f.button.click();
  f.plugin.componentsInstalled = true;
  f.plugin.fontsInstalled = true;
  assert.equal(render('Necessary files').text, 'Delete');
  await f.button.click();
  assert.equal(render('Extra fonts').text, 'Delete');
  await f.button.click();
  assert.deepEqual(actions, ['download core', 'download fonts', 'delete core', 'delete fonts']);
  f.plugin.deleting = 'core';
  assert.equal(render('Necessary files').text, 'Deleting…');
  assert.equal(f.button.disabled, true);
  assert.equal(render('Extra fonts').disabled, true);
  f.plugin.deleting = null;
  f.plugin.downloading = true;
  assert.equal(render('Necessary files').disabled, true);
  assert.equal(render('Extra fonts').disabled, true);
});

test('Connect resets and reveals an existing workspace without opening another tab', async () => {
  const f = fixture();
  await f.plugin.openWorkspace();
  f.connections.length = 0;
  f.revealed.length = 0;
  f.change('http://localhost:3775');
  await f.button.click();
  assert.deepEqual(f.connections, ['http://localhost:3775']);
  assert.equal(f.leaves.length, 1);
  assert.equal(f.leaves[0].view.route, '/');
  assert.deepEqual(f.revealed, f.leaves);
});

test('Connect rejects invalid addresses and does not open a workspace after a failed save', async () => {
  const f = fixture();
  f.change('https://example.com/pair?token=secret');
  await f.button.click();
  assert.equal(f.saved.length, 0);
  assert.equal(f.leaves.length, 0);
  f.change('http://localhost:3775');
  f.plugin.saveData = async () => { throw new Error('Disk unavailable'); };
  await f.button.click();
  assert.equal(f.leaves.length, 0);
  assert.match(f.notices.at(-1)!, /Could not save or reconnect/);
  assert.equal(f.button.disabled, false);
  assert.equal(f.button.text, 'Connect');
});

test('Connect shows progress while saving and restores the button when opening fails', async () => {
  const f = fixture();
  let finishSave!: () => void;
  f.plugin.saveData = () => new Promise<void>(resolve => { finishSave = resolve; });
  f.plugin.openWorkspace = async () => { throw new Error('View unavailable'); };
  const connecting = f.button.click();
  assert.equal(f.button.disabled, true);
  assert.equal(f.button.text, 'Connecting…');
  assert.deepEqual(f.connections, []);
  finishSave();
  await connecting;
  assert.equal(f.button.disabled, false);
  assert.equal(f.button.text, 'Connect');
  assert.match(f.notices.at(-1)!, /Could not save or reconnect/);
});
