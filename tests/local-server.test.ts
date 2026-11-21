import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { verifyLocalServer, ADAPTER_BUILD } from '../src/local-server';
import { T3_REVISION } from '../src/host-contract';
test('local proof requires shared filesystem and matching identity, and removes its challenge', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 't3-proof-'));
  const descriptor = {environmentId:'local', serverVersion:'0.1.11', orchestrationProtocolVersion:2, capabilities:{}};
  try {
    await verifyLocalServer('http://127.0.0.1:3773', descriptor, directory, async url => {
      const token = await readFile(new URL(url).searchParams.get('challenge')!, 'utf8');
      return {adapterBuild:ADAPTER_BUILD, revision:T3_REVISION, environmentId:'local', proof:createHash('sha256').update(token + ':local').digest('hex'), machineProof:createHmac('sha256',token).update('machine:'+(await readFile('/etc/machine-id','utf8')).trim()).digest('hex')};
    });
    assert.deepEqual(await readdir(directory), []);
    await assert.rejects(verifyLocalServer('http://127.0.0.1:3773', descriptor, directory, async () => ({adapterBuild:ADAPTER_BUILD, revision:T3_REVISION, environmentId:'local', proof:'claimed'})));
    assert.deepEqual(await readdir(directory), []);
    await assert.rejects(verifyLocalServer('http://127.0.0.1:3773', descriptor, directory, async () => {throw new Error('Network failed');}));
    assert.deepEqual(await readdir(directory), []);
  } finally { await rm(directory, {recursive:true, force:true}); }
});
test('a copied capability declaration cannot fabricate a verified local session', async () => {
  const {verifiedCompatibility} = await import('../src/local-server');
  assert.equal(verifiedCompatibility({environmentId:'local',serverVersion:'0.1.11',orchestrationProtocolVersion:2,capabilities:{obsidianHost:true}}, 'http://127.0.0.1:3773', {origin:'http://127.0.0.1:3773',environmentId:'local',build:ADAPTER_BUILD}).supported, false);
});
