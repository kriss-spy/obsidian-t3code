import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HostBridge } from '../src/host-bridge';
import { HostSession, T3_REVISION } from '../src/host-contract';

test('bridge checks the origin again after asynchronous evaluation', async () => {
  let url = 'http://127.0.0.1:3773/?obsidian-host=1';
  const session = new HostSession('/vault', 'local');
  let opened = 0;
  const guest = {getURL:() => url, executeJavaScript:async () => {
    url = 'https://other.example/';
    return [{type:'file', id:'1', generation:session.generation, environmentId:'local', path:'/a.md', newTab:false}];
  }};
  const bridge = new HostBridge(guest, 'http://127.0.0.1:3773', session, async () => {opened++; return true;});
  await assert.rejects(bridge.poll(), /navigation/);
  assert.equal(opened, 0);
});
test('bridge rejects a self-declared but wrong revision and stale request generations', async () => {
  const session = new HostSession('/vault', 'local');
  const guest = {getURL:() => 'http://127.0.0.1:3773/', executeJavaScript:async () => ({protocol:1, revision:'wrong', generation:session.generation})};
  await assert.rejects(new HostBridge(guest, 'http://127.0.0.1:3773', session, async () => true).initialize(), /handshake/);
  const second = new HostSession('/vault', 'local');
  const valid = {...guest, executeJavaScript:async (code:string) => code.includes('initialize')
    ? {protocol:1, revision:T3_REVISION, generation:second.generation}
    : [{type:'file', id:'1', generation:'stale', environmentId:'local', path:'/a.md', newTab:false}]};
  const bridge = new HostBridge(valid, 'http://127.0.0.1:3773', second, async () => {throw new Error('Must not open');});
  await bridge.initialize(); await assert.rejects(bridge.poll(), /identity/);
});
