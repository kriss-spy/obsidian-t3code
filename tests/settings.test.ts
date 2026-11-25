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

function settingItems(tab: SettingsTab) {
  return tab.getSettingDefinitions().flatMap(item => 'items' in item ? item.items ?? [] : [item]);
}

function fixture() {
  const notices: string[] = [];
  class PluginSettingTab { update() {} }
  const obsidian = { Plugin: class {}, PluginSettingTab, ItemView: class {}, FileSystemAdapter: class {},
    Notice: class { constructor(message: string) { notices.push(message); } } };
  const load = (bundle: string) => {
    const module = { exports: {} as any };
    new Function('require', 'module', 'exports', 'window', bundle)(
      (name: string) => name === 'obsidian' ? obsidian : nativeRequire(name), module, module.exports, globalThis);
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
  const definition = settingItems(tab).find(item => 'name' in item && item.name === 'T3 server');
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
    const definition = settingItems(f.tab).find(item => 'name' in item && item.name === name);
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

test('theme following uses a fresh enable token and remains independent of font following', async () => {
  const f=fixture();
  f.plugin.settings.followAppearance=false;
  await f.plugin.setFollowTheme(true);
  const first=f.plugin.settings.themeFollowToken;
  assert.match(first,/^[a-f0-9-]{36}$/);
  await f.plugin.setFollowTheme(false);
  assert.equal(f.plugin.settings.followAppearance,false);
  await f.plugin.setFollowTheme(true);
  assert.notEqual(f.plugin.settings.themeFollowToken,first);
  await f.plugin.themeOverridden(first);
  assert.equal(f.plugin.settings.followTheme,true);
  await f.plugin.themeOverridden(f.plugin.settings.themeFollowToken);
  assert.equal(f.plugin.settings.followTheme,false);
  assert.equal(f.plugin.settings.followAppearance,false);
  assert.equal((f.saved.at(-1) as any).followTheme,false);
});

test('failed follow-setting writes restore the prior ownership token', async () => {
  const f=fixture();
  const previous={...f.plugin.settings};
  f.plugin.saveData=async()=>{throw Error('Disk unavailable');};
  await assert.rejects(f.plugin.setFollowTheme(true),/Disk unavailable/);
  assert.deepEqual(f.plugin.settings,previous);
});

test('T3 choices update the plugin toggle in both directions without changing its token or font setting',async()=>{
  const f=fixture();await f.plugin.setFollowTheme(true);const token=f.plugin.settings.themeFollowToken;
  await f.plugin.themeFollowingChanged(token,false);assert.equal(f.plugin.settings.followTheme,false);
  await f.plugin.themeFollowingChanged(token,true);assert.equal(f.plugin.settings.followTheme,true);
  assert.equal(f.plugin.settings.themeFollowToken,token);assert.equal(f.plugin.settings.followAppearance,true);
  await f.plugin.setFollowTheme(false);assert.notEqual(f.plugin.settings.themeFollowToken,token);
  await f.plugin.themeFollowingChanged(token,true);assert.equal(f.plugin.settings.followTheme,false);
});

test('draft formatting toggle defaults off, saves both states and rolls back on save failure',async()=>{
  const f=fixture();assert.equal(f.plugin.settings.formatDraftLinks,false);
  let change=async(_value:boolean)=>{};
  const toggle={value:false,setValue(value:boolean){this.value=value;return this;},onChange(callback:typeof change){change=callback;return this;}};
  const definition=settingItems(f.tab).find(item=>'name' in item&&item.name==='Format draft links on return');
  assert.ok(definition&&'render' in definition&&definition.render);
  definition.render({addToggle:(callback:(value:typeof toggle)=>void)=>callback(toggle)} as any,{} as any);
  assert.equal(toggle.value,false);await change(true);
  assert.equal(f.plugin.settings.formatDraftLinks,true);assert.equal((f.saved.at(-1) as any).formatDraftLinks,true);
  await change(false);assert.equal(f.plugin.settings.formatDraftLinks,false);assert.equal((f.saved.at(-1) as any).formatDraftLinks,false);
  f.plugin.saveData=async()=>{throw Error('Disk unavailable');};await change(true);
  assert.equal(f.plugin.settings.formatDraftLinks,false);assert.match(f.notices.at(-1)!,/Could not save the draft formatting setting/);
});

test('folder action options remain visible and disable unavailable integrations',async()=>{
  const f=fixture();
  assert.equal(f.plugin.settings.folderAction,'default');
  assert.equal(f.plugin.settings.folderNoteName,'{folder}.md');
  let change=async(_value:string)=>{};
  const dropdown={selectEl:{options:[] as {value:string;text:string;disabled:boolean}[]},value:'',
    addOption(value:string,text:string){this.selectEl.options.push({value,text,disabled:false});return this;},
    setValue(value:string){this.value=value;return this;},onChange(fn:typeof change){change=fn;return this;}};
  const definition=settingItems(f.tab).find(item=>'name' in item&&item.name==='Ctrl+click folder action');
  assert.ok(definition&&'render' in definition&&definition.render);
  definition.render({addDropdown:(callback:(value:typeof dropdown)=>void)=>callback(dropdown)} as any,{} as any);
  assert.equal(dropdown.value,'default');assert.equal(dropdown.selectEl.options.length,5);
  assert.deepEqual(dropdown.selectEl.options.filter(o=>o.disabled).map(o=>o.value),['notebook','tree']);
  assert.match(dropdown.selectEl.options[3].text,/Notebook Navigator/);
  assert.match(dropdown.selectEl.options[4].text,/File Tree Alternative/);
  await change('notebook');assert.equal(f.saved.length,0);
  await change('explorer');assert.equal(f.plugin.settings.folderAction,'explorer');assert.equal((f.saved.at(-1) as any).folderAction,'explorer');
  f.plugin.saveData=async()=>{throw Error('Disk unavailable');};await change('note');
  assert.equal(f.plugin.settings.folderAction,'explorer');assert.match(f.notices.at(-1)!,/Could not save the folder action/);
});
