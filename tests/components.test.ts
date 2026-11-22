import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { componentStatus, decodeComponents, installComponents, type ComponentAsset } from '../src/components';
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function fixture(files: Record<string,string>, kind: 'core'|'fonts' = 'core') {
  const bytes = gzipSync(JSON.stringify({ version:'0.1.1', kind, files:Object.entries(files).map(([path,data]) => ({path,data:Buffer.from(data).toString('base64'),sha256:hash(data)})) }));
  const asset: ComponentAsset = {version:'0.1.1',kind,url:'https://example.com/files',sha256:hash(bytes),bytes:bytes.length};
  return {bytes,asset};
}
const core = () => fixture({'index.html':'new client','assets/main.js':'code','obsidian-host-client.json':'{}','obsidian-extra-fonts.css':'/* default */'});
test('installation detects missing and damaged files, preserves optional fonts and old hashed assets, and repairs files', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'t3-components-'));
  const f = core();
  try {
    assert.match((await componentStatus(root,f.asset))!, /missing/);
    await writeFile(path.join(root,'old.js'),'old tab');
    await installComponents(root,f.bytes,f.asset);
    assert.equal(await componentStatus(root,f.asset),null);
    const fonts=fixture({'fonts/test.woff2':'font','obsidian-extra-fonts.css':':root{--obsidian-extra-fonts:1}'},'fonts');
    await installComponents(root,fonts.bytes,fonts.asset);
    await installComponents(root,f.bytes,f.asset);
    assert.equal(await componentStatus(root,f.asset),null);
    assert.equal(await componentStatus(root,fonts.asset),null);
    assert.equal(await readFile(path.join(root,'old.js'),'utf8'),'old tab');
    await unlink(path.join(root,'assets/main.js'));
    assert.match((await componentStatus(root,f.asset))!,/missing/);
    await installComponents(root,f.bytes,f.asset);
    await writeFile(path.join(root,'assets/main.js'),'tampered');
    assert.match((await componentStatus(root,f.asset))!,/damaged/);
    await installComponents(root,f.bytes,f.asset);
    assert.equal(await componentStatus(root,f.asset),null);
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('downloads reject corrupt bytes, traversal, symbolic links, and cancellation before replacing the current entry', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'t3-components-'));
  const outside = await mkdtemp(path.join(tmpdir(),'t3-outside-'));
  try {
    const f=core();
    assert.throws(()=>decodeComponents(Buffer.from('corrupt'),f.asset),/checksum/);
    const traversal=fixture({'index.html':'bad','obsidian-host-client.json':'{}','../escape':'bad'});
    assert.throws(()=>decodeComponents(traversal.bytes,traversal.asset),/Invalid/);
    await writeFile(path.join(root,'index.html'),'original');
    await symlink(outside,path.join(root,'assets'));
    await assert.rejects(installComponents(root,f.bytes,f.asset),/symbolic/);
    assert.equal(await readFile(path.join(root,'index.html'),'utf8'),'original');
    await unlink(path.join(root,'assets'));
    const controller=new AbortController();controller.abort();
    await assert.rejects(installComponents(root,f.bytes,f.asset,controller.signal));
    assert.equal(await readFile(path.join(root,'index.html'),'utf8'),'original');
  } finally { await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true}); }
});
