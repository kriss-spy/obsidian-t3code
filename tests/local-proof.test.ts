import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifySharedFilesystem } from '../src/local-proof';
test('standard T3 file reads prove a fresh nonce and machine identity, and always remove the challenge', async () => {
  const directory = await mkdtemp(path.join(tmpdir(),'t3-local-proof-'));
  try {
    await verifySharedFilesystem(directory,async file=>({token:await readFile(file,'utf8'),machine:(await readFile('/etc/machine-id','utf8')).trim()}));
    assert.deepEqual(await readdir(directory),[]);
    for (const read of [async()=>({token:'wrong',machine:'wrong'}),async()=>{throw Error('Disconnected');}]) {
      await assert.rejects(verifySharedFilesystem(directory,read));
      assert.deepEqual(await readdir(directory),[]);
    }
    await assert.rejects(verifySharedFilesystem(directory,async file=>({token:await readFile(file,'utf8'),machine:'another-machine'})));
    assert.deepEqual(await readdir(directory),[]);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
