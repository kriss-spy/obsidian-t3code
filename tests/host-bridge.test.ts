import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HostBridge } from '../src/host-bridge';
import { HostSession, T3_REVISION, ADAPTER_BUILD, SCOPE_COVERAGE } from '../src/host-contract';

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
    ? {protocol:1, revision:T3_REVISION, generation:second.generation, build:ADAPTER_BUILD, coverage:SCOPE_COVERAGE}
    : [{type:'file', id:'1', generation:'stale', environmentId:'local', path:'/a.md', newTab:false}]};
  const bridge = new HostBridge(valid, 'http://127.0.0.1:3773', second, async () => {throw new Error('Must not open');});
  await bridge.initialize(); await assert.rejects(bridge.poll(), /identity/);
});
test('bridge waits for the public module and declines file requests from a previous route', async () => {
  const session = new HostSession('/vault','local');
  let handshakes = 0, opens = 0;
  const guest = {getURL:()=> 'http://127.0.0.1:3773/current', executeJavaScript:async (code:string) => {
    if (code.includes('initialize')) return ++handshakes === 1 ? 'pending' : {protocol:1,revision:T3_REVISION,generation:session.generation,build:ADAPTER_BUILD,coverage:SCOPE_COVERAGE};
    if (code.includes('drain')) return [{type:'file',id:'1',generation:session.generation,environmentId:'local',path:'/a.md',route:'/previous',newTab:false}];
    return true;
  }};
  const bridge = new HostBridge(guest,'http://127.0.0.1:3773',session,async()=>{opens++;return true;});
  await bridge.initialize();await bridge.poll();assert.equal(handshakes,2);assert.equal(opens,0);bridge.close();
});
test('context cannot append after the intended route changes while waiting for its composer', async () => {
  const session = new HostSession('/vault','local');
  let route='/intended',appends=0;
  const guest={getURL:()=> 'http://127.0.0.1:3773'+route,executeJavaScript:async(code:string)=>{
    if(code.includes('composerTarget')) {route='/other';return null;}
    if(code.includes('appendContext'))appends++;
    return true;
  }};
  const bridge=new HostBridge(guest,'http://127.0.0.1:3773',session,async()=>true);
  await assert.rejects(bridge.appendContext('captured note'),/target changed/);
  assert.equal(appends,0);bridge.close();
});
