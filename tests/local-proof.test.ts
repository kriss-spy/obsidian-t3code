import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifySharedFilesystem } from '../src/local-proof';
test('standard T3 file reads prove vault and host access, and always remove both challenges', async () => {
  const directory = await mkdtemp(path.join(tmpdir(),'t3-local-proof-'));
  try {
    let hostChallenge: string | undefined;
    const read = async (file: string, machineFile?: string) => {
      hostChallenge = machineFile;
      if (process.platform === 'win32') {
        assert.ok(machineFile);
        assert.notEqual(path.dirname(machineFile), directory);
        assert.match(await readFile(machineFile, 'utf8'), /^[a-f0-9]{64}$/);
      } else { assert.equal(machineFile, undefined); }
      return {token:await readFile(file,'utf8'),machine:(await readFile(machineFile ?? '/etc/machine-id','utf8')).trim()};
    };
    await verifySharedFilesystem(directory, read);
    if (hostChallenge) await assert.rejects(readFile(hostChallenge), {code:'ENOENT'});
    assert.deepEqual(await readdir(directory),[]);
    for (const fail of [async()=>({token:'wrong',machine:'wrong'}),async()=>{throw Error('Disconnected');}]) {
      await assert.rejects(verifySharedFilesystem(directory,async (file,machineFile)=>{
        hostChallenge=machineFile;
        return fail();
      }));
      assert.deepEqual(await readdir(directory),[]);
      if (hostChallenge) await assert.rejects(readFile(hostChallenge), {code:'ENOENT'});
    }
    await assert.rejects(verifySharedFilesystem(directory,async file=>({token:await readFile(file,'utf8'),machine:'another-machine'})));
    assert.deepEqual(await readdir(directory),[]);
    // A new verification must not reuse the previous challenge values.
    let previous: unknown;
    await verifySharedFilesystem(directory, async (file,machineFile) => { previous=await read(file,machineFile); return previous; });
    await assert.rejects(verifySharedFilesystem(directory, async () => previous));
  } finally { await rm(directory,{recursive:true,force:true}); }
});
