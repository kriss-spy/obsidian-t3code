import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { T3_REVISION } from '../src/host-contract';

// Exercise the exact module shipped in the patch, rather than a second fixture implementation.
function moduleSource() {
  const patch = readFileSync('upstream/t3-0.1.11-obsidian-host-v1.patch', 'utf8');
  const section = patch.split('diff --git a/apps/web/src/obsidianHost.ts b/apps/web/src/obsidianHost.ts\n')[1].split('\ndiff --git ')[0];
  return section.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1)).join('\n');
}
function load(embedded = true) {
  const module = {exports:{} as Record<string, (...args: any[]) => any>};
  const window: any = {};
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const code = transformSync(moduleSource(), {loader:'ts', format:'cjs'}).code;
  vm.runInNewContext(code, {module, exports:module.exports, window, URLSearchParams,
    location:{search:embedded ? '?obsidian-host=1' : ''},
    setTimeout:(fn:() => void) => { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout:(id:number) => timers.delete(id),
  });
  return {api:window.t3ObsidianHostV1, exports:module.exports, timers};
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const snapshot = {projects:[{id:'p', workspaceRoot:'/vault'}], threads:[{id:'t', projectId:'p', worktreePath:null}], archivedThreads:[]};
test('pinned patch starts empty until handshake and host verdict; metadata changes invalidate approval', async () => {
  const {api, exports:e} = load();
  assert.equal(api.revision, T3_REVISION);
  let started = false;
  void e.waitForObsidianHost().then(() => {started = true;});
  await flush(); assert.equal(started, false);
  assert.equal(e.scopeObsidianSnapshot('local', snapshot).threads.length, 0);
  api.initialize({generation:'g', environmentId:'local'});
  assert.throws(() => api.initialize({generation:'g', environmentId:'local'}));
  await flush(); assert.equal(started, true);
  assert.equal(e.scopeObsidianSnapshot('local', snapshot).threads.length, 0);
  const [request] = api.drain();
  assert.equal(request.rows.length, 2);
  assert.equal(api.reply({id:request.id, generation:'stale', allowed:['thread:t']}), false);
  api.reply({id:request.id, generation:'g', allowed:['project:p', 'thread:t']});
  await flush();
  assert.equal(e.scopeObsidianSnapshot('local', snapshot).threads.length, 1);
  assert.equal(e.scopeObsidianSnapshot('remote', snapshot).threads.length, 0);
  assert.equal(e.scopeObsidianSnapshot('local', {...snapshot, threads:[{...snapshot.threads[0], worktreePath:'/outside'}]}).threads.length, 0);
  assert.equal(e.scopeObsidianSnapshot('local', {...snapshot, projects:[], threads:[]}).threads.length, 0);
});
test('semantic Markdown hook preserves environment, location and modifier intent', async () => {
  const {api, exports:e} = load();
  api.initialize({generation:'g', environmentId:'local'});
  const result = e.openObsidianMarkdown({environmentId:'local', path:'/vault/空 格#.md', line:3, newTab:true});
  const [request] = api.drain();
  assert.equal(request.type, 'file'); assert.equal(request.path, '/vault/空 格#.md');
  assert.equal(request.line, 3); assert.equal(request.newTab, true);
  api.reply({id:request.id, generation:'g', handled:true});
  assert.equal(await result, true);
  for (const input of [{environmentId:'remote', path:'/a.md'}, {environmentId:'local', path:'/a.ts'}, {environmentId:'local', path:'relative.md'}]) {
    assert.equal(await e.openObsidianMarkdown({...input, newTab:false}), false);
  }
  assert.equal(api.drain().length, 0);
});
test('request queue stays bounded and timed-out file requests preserve T3 fallback', async () => {
  const {api, exports:e, timers} = load();
  api.initialize({generation:'g', environmentId:'local'});
  const results = Array.from({length:12}, () => e.openObsidianMarkdown({environmentId:'local', path:'/a.md', newTab:false}));
  for (const expire of [...timers.values()]) expire();
  assert.deepEqual(await Promise.all(results), Array(12).fill(false));
  assert.equal(api.drain().length, 0);
});
test('ordinary clients retain the original snapshot and do not expose a host API', async () => {
  const {api, exports:e} = load(false);
  assert.equal(api, undefined); assert.equal(e.scopeObsidianSnapshot('local', snapshot), snapshot);
  await e.waitForObsidianHost();
});
