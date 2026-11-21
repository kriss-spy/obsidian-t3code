import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAddedPatchSource } from './patch-source';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { T3_REVISION } from '../src/host-contract';

// Exercise the exact module shipped in the patch, rather than a second fixture implementation.
function load(embedded = true) {
  const module = {exports:{} as Record<string, (...args: any[]) => any>};
  const window: any = {};
  const location = {search:embedded ? "?obsidian-host=1" : "",pathname:"/local/thread"};
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const code = transformSync(readAddedPatchSource('apps/web/src/obsidianHost.ts'), {loader:'ts', format:'cjs'}).code;
  vm.runInNewContext(code, {module, exports:module.exports, window, URLSearchParams,
    location,
    setTimeout:(fn:() => void) => { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout:(id:number) => timers.delete(id),
  });
  return {api:window.t3ObsidianHostV1, exports:module.exports, timers, location};
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
test('approved worktrees retain owning metadata without widening project choices', async () => {
  const {api, exports:e} = load();
  api.initialize({generation:'g', environmentId:'local'});
  const value = {projects:[{id:'outside', workspaceRoot:'/outside'}], threads:[{id:'inside-worktree', projectId:'outside', worktreePath:'/vault/worktree'}], archivedThreads:[]};
  assert.equal(e.scopeObsidianSnapshot('local', value).threads.length, 0);
  const [request] = api.drain();
  api.reply({id:request.id, generation:'g', allowed:['thread:inside-worktree']});
  await flush();
  const scoped = e.scopeObsidianSnapshot('local', value);
  assert.equal(scoped.threads.length, 1); assert.equal(scoped.projects.length, 1);
  assert.equal(e.isObsidianProjectAllowed('local', value.projects[0]), false);
});
test('scope reconnect invalidates active and archived rows and ignores old verdicts', async () => {
  const {api, exports:e} = load();
  api.initialize({generation:'g', environmentId:'local'});
  e.setObsidianScopeEpoch('local', '1:live');
  const value = {...snapshot, archivedThreads:[{id:'a', projectId:'p', worktreePath:'/vault/archive'}]};
  e.scopeObsidianSnapshot('local', value);
  const [old] = api.drain();
  e.setObsidianScopeEpoch('local', '2:synchronizing');
  api.reply({id:old.id, generation:'g', allowed:['project:p','thread:t','thread:a']});
  await flush();
  const scoped = e.scopeObsidianSnapshot('local', value);
  assert.equal(scoped.threads.length, 0); assert.equal(scoped.archivedThreads.length, 0);
  const [current] = api.drain();
  api.reply({id:current.id, generation:'g', allowed:[]});await flush();
  assert.equal(e.scopeObsidianSnapshot('local', value).threads.length, 0);
  assert.equal(e.obsidianThreadDecision('local', value.threads[0], value.projects), 'excluded');
});
test('scope completion notifies empty-scope readers after pending rows clear', async () => {
  const {api, exports:e} = load();api.initialize({generation:'g',environmentId:'local'});
  const pending: boolean[] = [];e.subscribeObsidianScope(()=>pending.push(e.obsidianScopePending()));
  e.scopeObsidianSnapshot('local', snapshot);const [r]=api.drain();
  assert.equal(e.obsidianScopePending(),true);
  api.reply({id:r.id,generation:'g',allowed:[]});await flush();
  assert.deepEqual(pending,[false]);
});
test('conflicting active and archived metadata never shares an approval', async () => {
  const {api, exports:e}=load();api.initialize({generation:'g',environmentId:'local'});
  e.scopeObsidianSnapshot('local',snapshot);const [r]=api.drain();api.reply({id:r.id,generation:'g',allowed:['project:p','thread:t']});await flush();
  const conflict={...snapshot,archivedThreads:[{...snapshot.threads[0],worktreePath:'/outside'}]};
  const result=e.scopeObsidianSnapshot('local',conflict);assert.equal(result.threads.length,0);assert.equal(result.archivedThreads.length,0);
});
test('public composer target rejects old routes, generations and replaced registrations', async () => {
  const {api,exports:e}=load();api.initialize({generation:'g',environmentId:'local'});
  const inserted:string[]=[];
  const remove=e.registerObsidianComposer('thread-one',(text:string)=>{inserted.push(text);return true;});
  const first=api.composerTarget();
  assert.equal(api.appendContext({generation:'old',target:first,text:'wrong'}),false);
  e.registerObsidianComposer('thread-two',(text:string)=>{inserted.push(text);return true;});
  remove();
  assert.equal(api.appendContext({generation:'g',target:first,text:'wrong'}),false);
  assert.equal(api.appendContext({generation:'g',target:api.composerTarget(),text:'exact\n空 ``` text'}),true);
  assert.deepEqual(inserted,['exact\n空 ``` text']);
  assert.equal(await api.prepareComposer('/different'),null);
});

test('native menu checks require a host verdict and decline stale routes and ordinary clients', async () => {
  const {api,exports:e}=load();api.initialize({generation:'g',environmentId:'local'});
  const verified=e.verifyObsidianMarkdown('local','/vault/note.md');const [r]=api.drain();
  assert.equal(r.type,'file-check');api.reply({id:r.id,generation:'g',handled:true});assert.equal(await verified,true);
  assert.equal(await e.verifyObsidianMarkdown('remote','/vault/note.md'),false);
  assert.equal(await e.verifyObsidianMarkdown('local','/vault/note.ts'),false);
  assert.equal(await load(false).exports.verifyObsidianMarkdown('local','/vault/note.md'),false);
  const next=load();next.api.initialize({generation:'g',environmentId:'local'});
  const stale=next.exports.verifyObsidianMarkdown('local','/vault/note.md');const [check]=next.api.drain();
  next.location.pathname='/local/other';next.api.reply({id:check.id,generation:'g',handled:true});assert.equal(await stale,false);
});
test('reference drops preserve the intended composer and leave ordinary attachments to T3', async () => {
  const {api,exports:e}=load();api.initialize({generation:'g',environmentId:'local'});
  const owner={}, other={}, inserted:string[]=[];let prevented=0,stopped=0;
  const event={dataTransfer:{types:[e.OBSIDIAN_REFERENCE_MIME],getData:()=> 'token'},preventDefault:()=>prevented++,stopPropagation:()=>stopped++};
  e.registerObsidianComposer('one',(text:string)=>{inserted.push(text);return true;},(candidate:unknown)=>candidate===owner);
  assert.equal(e.dropObsidianReferences(event,other,String),false);
  assert.equal(e.dropObsidianReferences({...event,dataTransfer:{...event.dataTransfer,types:['Files']}},owner,String),false);
  assert.equal(prevented,0);
  assert.equal(e.dropObsidianReferences(event,owner,String),true);
  const [request]=api.drain();assert.equal(request.type,'references');
  e.registerObsidianComposer('two',()=>{throw Error('Changed composer');},()=>true);
  api.reply({id:request.id,generation:'g',paths:['/vault/note.md']});await flush();assert.equal(inserted.length,0);
  e.registerObsidianComposer('three',(text:string)=>{inserted.push(text);return true;},(candidate:unknown)=>candidate===owner);
  e.dropObsidianReferences(event,owner,(p:string)=>`ref(${p})`);const [next]=api.drain();api.reply({id:next.id,generation:'g',paths:['/vault/空 note.md','/vault/folder']});await flush();
  assert.deepEqual(inserted,['ref(/vault/空 note.md) ref(/vault/folder) ']);assert.equal(stopped,2);
});
