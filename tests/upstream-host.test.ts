import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAddedPatchSource } from './patch-source';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { T3_REVISION } from '../src/host-contract';

// Exercise the exact module shipped in the patch, rather than a second fixture implementation.
function load(embedded = true, readFile?: (input: {cwd:string;relativePath:string}) => Promise<string>) {
  const module = {exports:{} as Record<string, (...args: any[]) => any>};
  const window: any = {innerWidth:1200,innerHeight:800};
  const location = {search:embedded ? "?obsidian-host=1" : "",pathname:"/local/thread"};
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const code = transformSync(readAddedPatchSource('apps/web/src/obsidianHost.ts'), {loader:'ts', format:'cjs'}).code.replace(/\bimport\(/g, 'loadModule(');
  vm.runInNewContext(code, {module, exports:module.exports, window, URLSearchParams, URL,
    location,
    setTimeout:(fn:() => void) => { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout:(id:number) => timers.delete(id),
    loadModule: async (name:string) => {
      if(name === './state/projects')return {projectEnvironment:{readFile:({input}:any)=>input}};
      if(name === './rpc/atomRegistry')return {appAtomRegistry:{}};
      if(name === 'effect/reactivity/AtomRegistry')return {getResult:(_registry:any,input:any)=>({pipe:()=>input})};
      if(name === 'effect/Effect')return {timeout:()=>{},runPromise:async(input:any)=>({contents:await readFile!(input),exists:true,truncated:false})};
      if(name === '@t3tools/contracts')return {EnvironmentId:{make:(value:string)=>value}};
      throw new Error('Unexpected test dependency: '+name);
    },
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

test('system browser hook sends only HTTP URLs through the bounded host queue', async () => {
  const {api,exports:e}=load();api.initialize({generation:'g',environmentId:'local'});
  const result=e.openObsidianExternal('https://example.com/path?q=one#two');
  const [request]=api.drain();assert.equal(request.type,'browser');assert.equal(request.url,'https://example.com/path?q=one#two');assert.equal(request.route,'/local/thread');
  api.reply({id:request.id,generation:'g',handled:true});assert.equal(await result,true);
  for(const url of ['file:///etc/passwd','javascript:alert(1)','https://user:secret@example.com','relative'])assert.equal(await e.openObsidianExternal(url),false);
  assert.equal(api.drain().length,0);assert.equal(await load(false).exports.openObsidianExternal('https://example.com'),false);
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

test('more drafts than request slots remain pending until each receives a scope verdict', async () => {
  const {api,exports:e}=load();api.initialize({generation:'g',environmentId:'local'});
  const drafts=Array.from({length:12},(_,i)=>({id:'draft-'+i,projectId:'p',worktreePath:null}));
  const decisions=()=>drafts.map(draft=>e.obsidianThreadDecision('local',draft,snapshot.projects));
  assert.deepEqual(decisions(),Array(12).fill('pending'));
  await flush();
  assert.deepEqual(decisions(),Array(12).fill('pending'));
  const opening=e.openObsidianExternal('https://example.com');
  for(let batch=0;batch<2;batch++) {
    const requests=api.drain();
    if(batch===0)assert(requests.some((r:any)=>r.type==='browser'),'Scope checks must leave room for an explicit browser action');
    for(const request of requests)api.reply({id:request.id,generation:'g',handled:true,allowed:request.rows?.map((row:any)=>row.kind+':'+row.id)});
    await flush();decisions();
  }
  assert.equal(await opening,true);
  assert.deepEqual(decisions(),Array(12).fill('included'));
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
  const event={dataTransfer:{types:['application/x-t3-obsidian-reference-v1'],getData:()=> 'token'},preventDefault:()=>prevented++,stopPropagation:()=>stopped++};
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

test('native explorer drop target exposes only the registered composer and rejects stale insertion', () => {
  const {api,exports:e,location}=load();api.initialize({generation:'g',environmentId:'local'});
  const inserted:string[][]=[];
  e.registerObsidianComposer('target',()=>true,()=>true,()=>({x:20,y:30,width:500,height:200}),(paths:string[])=>{inserted.push(paths);return true;});
  const target=api.referenceDropTarget();assert.equal(target.route,'/local/thread');assert.equal(target.rect.x,20);
  assert.equal(api.appendReferences({generation:'stale',target:target.target,paths:['/vault/a.md']}),false);
  assert.equal(api.appendReferences({generation:'g',target:target.target,paths:['/vault/a.md']}),true);
  location.pathname='/local/other';assert.equal(api.referenceDropTarget(),null);
  assert.equal(api.appendReferences({generation:'g',target:target.target,paths:['/vault/b.md']}),false);
  assert.deepEqual(inserted,[['/vault/a.md']]);
});

test('an unpatched server stays scoped empty until authenticated filesystem proof is confirmed', async () => {
  const {api,exports:e}=load();
  api.initialize({generation:'g',environmentId:'local',vaultRoot:'/vault',requiresLocalProof:true});
  assert.equal(e.scopeObsidianSnapshot('local',snapshot).threads.length,0);
  assert.equal(e.obsidianScopePending(),true);
  assert.equal(api.drain().length,0);
  assert.equal(e.obsidianVaultSetup(),null);
  assert.equal(api.confirmLocal({generation:'stale'}),false);
  assert.equal(api.confirmLocal({generation:'g'}),true);
  assert.equal(e.scopeObsidianSnapshot('local',snapshot).threads.length,0);
  const [request]=api.drain();
  assert.equal(request.type,'scope');
  api.reply({id:request.id,generation:'g',allowed:['project:p','thread:t']});
  await flush();
  assert.equal(e.scopeObsidianSnapshot('local',snapshot).threads.length,1);
});

test('Windows vault paths survive initialization and native Markdown requests', async () => {
  const {api, exports:e} = load();
  const vaultRoot = 'C:\\Users\\tester\\空 vault';
  api.initialize({generation:'g',environmentId:'local',vaultRoot});
  assert.equal(e.obsidianVaultSetup()?.path, vaultRoot);
  const file = vaultRoot + '\\note.md';
  const opening = e.openObsidianMarkdown({environmentId:'local',path:file,newTab:false});
  const [request] = api.drain();
  assert.equal(request?.path, file);
  api.reply({id:request.id,generation:'g',handled:true});
  assert.equal(await opening, true);
  const checking = e.verifyObsidianMarkdown('local', file);
  const [check] = api.drain();
  assert.equal(check?.type, 'file-check');
  api.reply({id:check.id,generation:'g',handled:true});
  assert.equal(await checking, true);
});

test('Windows proof reads both challenges through T3 and rejects stale or escaping requests', async () => {
  const reads: string[] = [];
  const vaultRoot = 'C:\\Users\\tester\\空 vault';
  const file = vaultRoot + '\\.obsidian\\t3-code-host-12345678-1234-1234-1234-123456789abc';
  const machinePath = 'C:\\Users\\tester\\AppData\\Local\\Temp\\t3-code-machine-12345678-1234-1234-1234-123456789abc';
  const {api} = load(true, async input => {
    assert.equal(input.cwd, vaultRoot);
    reads.push(input.relativePath);
    return input.relativePath === file ? 'vault-token' : 'host-token';
  });
  api.initialize({generation:'g',environmentId:'local',vaultRoot,requiresLocalProof:true});
  const proof = await api.readLocalProof({generation:'g',path:file,machinePath});
  assert.equal(proof.token, 'vault-token');
  assert.equal(proof.machine, 'host-token');
  assert.deepEqual(reads, [file,machinePath]);
  for (const input of [
    {generation:'stale',path:file,machinePath},
    {generation:'g',path:file.replace('空 vault','空 vault-backup'),machinePath},
    {generation:'g',path:file.replace('.obsidian', '..'),machinePath},
    {generation:'g',path:file,machinePath:machinePath.replace('t3-code-machine-', 'other-')},
  ]) await assert.rejects(api.readLocalProof(input), /Invalid local proof/);
  assert.equal(reads.length, 2);
});

test('macOS proof reads both challenges through T3 and rejects stale or escaping requests', async () => {
  const reads: string[] = [];
  const vaultRoot = '/Users/tester/空 vault';
  const file = vaultRoot + '/.obsidian/t3-code-host-12345678-1234-1234-1234-123456789abc';
  const machinePath = '/var/folders/test/T/t3-code-machine-12345678-1234-1234-1234-123456789abc';
  const {api} = load(true, async input => {
    assert.equal(input.cwd, vaultRoot);
    reads.push(input.relativePath);
    return input.relativePath === file ? 'vault-token' : 'host-token';
  });
  api.initialize({generation:'g',environmentId:'local',vaultRoot,requiresLocalProof:true});
  const proof = await api.readLocalProof({generation:'g',path:file,machinePath});
  assert.equal(proof.token, 'vault-token');
  assert.equal(proof.machine, 'host-token');
  assert.deepEqual(reads, [file,machinePath]);
  for (const input of [
    {generation:'stale',path:file,machinePath},
    {generation:'g',path:file.replace('空 vault','空 vault-backup'),machinePath},
    {generation:'g',path:file.replace('.obsidian', '..'),machinePath},
    {generation:'g',path:file,machinePath:machinePath.replace('t3-code-machine-', 'other-')},
  ]) await assert.rejects(api.readLocalProof(input), /Invalid local proof/);
  assert.equal(reads.length, 2);
});

test('temporary draft return binds to its composer and acknowledges retries once', () => {
  const {api,exports:e} = load();
  api.initialize({generation:'g',environmentId:'local',requiresLocalProof:true});
  let text = 'original [[Note]]', version = 'v1', writes = 0;
  const draft = {read:()=>({text,cwd:'/vault/project',version}),replace:(next:string)=>{writes++;text=next;version='v2';return true;}};
  const unregister = e.registerObsidianComposer('thread',()=>true,()=>true,undefined,undefined,draft);
  assert.equal(api.beginDraft({generation:'g',id:'before-proof'}),null);
  api.confirmLocal({generation:'g'});
  assert.equal(api.beginDraft({generation:'stale',id:'bad'}),null);
  assert.equal(api.beginDraft({generation:'g',id:'request'}).text,text);
  const input = {generation:'g',id:'request',text:'edited draft'};
  assert.equal(api.returnDraft({...input,generation:'stale'}),false);
  assert.equal(api.returnDraft(input),true);
  assert.equal(api.returnDraft(input),true);
  assert.equal(api.returnDraft({...input,text:'different retry'}),false);
  assert.equal(writes,1);
  assert.equal(text,'edited draft');
  api.cancelDraft({generation:'g',id:'request'});
  assert.equal(api.returnDraft(input),false);
  unregister();
});

test('temporary drafts reject newer input, replacement registrations and route changes; cancel writes nothing', () => {
  const {api,exports:e,location} = load();
  api.initialize({generation:'g',environmentId:'local'});api.confirmLocal({generation:'g'});
  let version = 'v1',writes = 0;
  const draft = {read:()=>({text:'original',cwd:'/vault',version}),replace:()=>{writes++;return true;}};
  e.registerObsidianComposer('thread',()=>true,()=>true,undefined,undefined,draft);
  api.beginDraft({generation:'g',id:'changed'});
  version = 'v2';
  assert.equal(api.returnDraft({generation:'g',id:'changed',text:'edited'}),false);
  api.beginDraft({generation:'g',id:'route'});
  location.pathname='/other';
  assert.equal(api.returnDraft({generation:'g',id:'route',text:'edited'}),false);
  location.pathname='/local/thread';
  e.registerObsidianComposer('thread',()=>true,()=>true,undefined,undefined,draft);
  assert.equal(api.returnDraft({generation:'g',id:'route',text:'edited'}),false);
  api.beginDraft({generation:'g',id:'canceled'});
  assert.equal(api.cancelDraft({generation:'g',id:'canceled'}),true);
  assert.equal(api.returnDraft({generation:'g',id:'canceled',text:'edited'}),false);
  assert.equal(writes,0);
});
