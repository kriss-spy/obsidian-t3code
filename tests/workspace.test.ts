import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import type T3Plugin from '../src/main';
import type { App, PluginManifest } from 'obsidian';

// Exercise the production plugin with only the Obsidian runtime boundary mocked.
const bundle = buildSync({ entryPoints: ['src/main.ts'], bundle: true, write: false,
  platform: 'node', format: 'cjs', external: ['obsidian', 'electron'] }).outputFiles[0].text;
const nativeRequire = createRequire(import.meta.url);
function createPlugin() {
  const module = { exports: {} as { default: typeof T3Plugin } };
  const obsidian = { Plugin: class {}, PluginSettingTab: class {}, ItemView: class {}, FileSystemAdapter: class {} };
  new Function('require', 'module', 'exports', bundle)(
    (name: string) => name === 'obsidian' ? obsidian : nativeRequire(name), module, module.exports);
  return new module.exports.default({} as App, {} as PluginManifest);
}

function fixture() {
  const plugin = createPlugin();
  const windowA = {} as Document;
  const windowB = {} as Document;
  let owner = windowA;
  type Leaf = { view: { containerEl: { ownerDocument: Document } }; setViewState: () => Promise<void> };
  const leaves: Leaf[] = [];
  const revealed: Leaf[] = [];
  const pending: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  const workspace = {
    getMostRecentLeaf: () => ({ view: { containerEl: { ownerDocument: owner } } }),
    getLeavesOfType: () => leaves,
    getLeaf: () => {
      const leaf: Leaf = {
        view: { containerEl: { ownerDocument: owner } },
        setViewState: () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })),
      };
      leaves.push(leaf);
      return leaf;
    },
    setActiveLeaf: () => {},
    revealLeaf: async (leaf: Leaf) => { revealed.push(leaf); },
  };
  Object.defineProperty(plugin, 'app', { value: { workspace } });
  return { plugin, windowA, windowB, leaves, revealed, pending, activate: (document: Document) => { owner = document; } };
}

test('overlapping Open requests deduplicate within each window and remain independent across windows', async () => {
  const f = fixture();
  const a = f.plugin.openWorkspace();
  assert.equal(f.plugin.openWorkspace(), a);
  f.activate(f.windowB);
  const b = f.plugin.openWorkspace();
  assert.notEqual(a, b);
  assert.equal(f.plugin.openWorkspace(), b);
  assert.equal(f.leaves.length, 2);
  f.activate(f.windowA);
  assert.equal(f.plugin.openWorkspace(), a);
  // Complete B first to exercise completion while another window remains pending.
  f.pending[1].resolve();
  assert.equal(await b, f.leaves[1].view);
  assert.equal(f.plugin.openWorkspace(), a);
  f.pending[0].resolve();
  assert.equal(await a, f.leaves[0].view);
  assert.deepEqual(f.revealed, [f.leaves[1], f.leaves[0]]);
  assert.equal(await f.plugin.openWorkspace(), f.leaves[0].view);
  assert.equal(f.leaves.length, 2);
});

test('failed Open releases only its own window pending operation and permits retry', async () => {
  const f = fixture();
  const a = f.plugin.openWorkspace();
  f.activate(f.windowB);
  const b = f.plugin.openWorkspace();
  f.pending[0].reject(new Error('Fixture open failure'));
  await assert.rejects(a, /Fixture open failure/);
  assert.equal(f.plugin.openWorkspace(), b);
  f.leaves.shift(); // Obsidian removed the failed leaf.
  f.activate(f.windowA);
  const retry = f.plugin.openWorkspace();
  assert.notEqual(retry, a);
  f.pending[2].resolve();
  await retry;
  f.pending[1].resolve();
  await b;
});
