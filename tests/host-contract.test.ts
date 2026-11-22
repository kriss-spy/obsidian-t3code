import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HostSession, parseHostRequest } from '../src/host-contract';

test('host scope uses canonical identities and never widens an empty result', () => {
  const root = mkdtempSync(path.join(tmpdir(), 't3-host-'));
  try {
    const vault = path.join(root, 'vault'); const outside = path.join(root, 'vault-backup');
    mkdirSync(vault); mkdirSync(outside); mkdirSync(path.join(vault, 'nested'));
    symlinkSync(outside, path.join(vault, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const host = new HostSession(vault, 'local');
    const request = {type:'scope', id:'1', generation:host.generation, environmentId:'local', rows:[
      {kind:'project', id:'p', projectId:'p', workspaceRoot:vault, worktreePath:null},
      {kind:'thread', id:'inside', projectId:'p', workspaceRoot:vault, worktreePath:path.join(vault, 'nested')},
      {kind:'thread', id:'outside', projectId:'p', workspaceRoot:vault, worktreePath:outside},
      {kind:'thread', id:'escape', projectId:'p', workspaceRoot:vault, worktreePath:path.join(vault, 'escape')},
      {kind:'thread', id:'missing', projectId:'p', workspaceRoot:vault, worktreePath:path.join(vault, 'missing')},
    ]};
    assert.deepEqual(host.scope(request).allowed, ['project:p', 'thread:inside']);
    assert.deepEqual(host.scope({...request, environmentId:'remote'}).allowed, []);
    assert.deepEqual(host.scope({...request, rows:[]}).allowed, []);
    assert.throws(() => host.scope({...request, generation:'stale'}));
    host.invalidate(); assert.throws(() => host.scope(request));
  } finally { rmSync(root, {recursive:true, force:true}); }
});
test('host rejects malformed, oversized and duplicate requests', () => {
  const base = {type:'file', id:'x', generation:'g', environmentId:'local', path:'/a.md', newTab:false};
  assert.equal(parseHostRequest(base, 'g').type, 'file');
  assert.equal(parseHostRequest({...base, path:'/vault/a\\0.md'}, 'g').type, 'file');
  for (const change of [{line:0}, {column:-1}, {path:'a\0.md'}, {newTab:1}, {environmentId:''}, {id:null}]) {
    assert.throws(() => parseHostRequest({...base, ...change}, 'g'));
  }
  assert.throws(() => parseHostRequest({...base, type:'scope', rows:Array(20001).fill({})}, 'g'));
  const row = {kind:'project', id:'p', projectId:'p', workspaceRoot:'/vault', worktreePath:null};
  assert.throws(() => parseHostRequest({...base, type:'scope', rows:[row, row]}, 'g'));
  const aliases = {...base,type:'aliases',cwd:'/vault',query:'空',route:'/local/thread',limit:80,entries:[{path:'note.md',kind:'file'}]};
  assert.equal(parseHostRequest(aliases,'g').type,'aliases');
  const browser={...base,type:'browser',url:'https://example.com/path?q=1#two',route:'/local/thread'};
  assert.equal(parseHostRequest(browser,'g').type,'browser');
  for (const url of ['javascript:alert(1)','file:///etc/passwd','data:text/html,test','https://user:secret@example.com','relative/path'])assert.throws(()=>parseHostRequest({...browser,url},'g'));
  for (const change of [{entries:[null]}, {entries:[{path:'note.md',kind:'file',ignored:'yes'}]}, {limit:501}, {query:'x'.repeat(257)}, {entries:Array(501).fill({path:'note.md',kind:'file'})}]) {
    assert.throws(()=>parseHostRequest({...aliases,...change},'g'));
  }
});
