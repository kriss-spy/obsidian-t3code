import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { componentStatus, decodeComponents, installComponents, removeComponents, type ComponentAsset } from '../src/components';
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function fixture(files: Record<string,string>, kind: 'core'|'fonts' = 'core') {
  const bytes = gzipSync(JSON.stringify({ version:'0.1.1', kind, files:Object.entries(files).map(([path,data]) => ({path,data:Buffer.from(data).toString('base64'),sha256:hash(data)})) }));
  const asset: ComponentAsset = {version:'0.1.1',kind,url:'https://example.com/files',sha256:hash(bytes),bytes:bytes.length};
  return {bytes,asset};
}
const core = () => fixture({'index.html':'new client','assets/main.js':'code','obsidian-host-client.json':'{}','obsidian-extra-fonts.css':'/* default */'});
test('deleting either package preserves the other package and permits reinstallation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 't3-components-'));
  const required = core();
  const fonts = fixture({'fonts/test.woff2':'font','obsidian-extra-fonts.css':'@font-face{}'}, 'fonts');
  try {
    await installComponents(root, required.bytes, required.asset);
    await installComponents(root, fonts.bytes, fonts.asset);
    await writeFile(path.join(root, 'unrelated.txt'), 'keep');
    await removeComponents(root, fonts.asset);
    assert.equal(await componentStatus(root, required.asset), null);
    assert.match((await componentStatus(root, fonts.asset))!, /not installed/);
    await assert.rejects(readFile(path.join(root, 'fonts/test.woff2')), {code:'ENOENT'});
    assert.doesNotMatch(await readFile(path.join(root, 'obsidian-extra-fonts.css'), 'utf8'), /@font-face/);
    await installComponents(root, fonts.bytes, fonts.asset);
    await removeComponents(root, required.asset);
    assert.match((await componentStatus(root, required.asset))!, /missing/);
    assert.equal(await componentStatus(root, fonts.asset), null);
    await assert.rejects(readFile(path.join(root, 'index.html')), {code:'ENOENT'});
    assert.equal(await readFile(path.join(root, 'unrelated.txt'), 'utf8'), 'keep');
    await installComponents(root, required.bytes, required.asset);
    assert.equal(await componentStatus(root, required.asset), null);
    assert.equal(await componentStatus(root, fonts.asset), null);
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('deletion rejects symlinks, unsafe receipts and cancellation before deleting files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 't3-components-'));
  const outside = await mkdtemp(path.join(tmpdir(), 't3-outside-'));
  const f = core();
  try {
    await installComponents(root, f.bytes, f.asset);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(removeComponents(root, f.asset, controller.signal));
    assert.equal(await componentStatus(root, f.asset), null);
    await rm(path.join(root, 'assets'), {recursive:true});
    await writeFile(path.join(outside, 'main.js'), 'keep');
    await symlink(outside, path.join(root, 'assets'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(removeComponents(root, f.asset), /symbolic/);
    assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), 'new client');
    assert.equal(await readFile(path.join(outside, 'main.js'), 'utf8'), 'keep');
    await writeFile(path.join(root, '.obsidian-t3-core.json'), JSON.stringify({version:f.asset.version, sha256:f.asset.sha256, files:[{path:'../escape'}]}));
    await assert.rejects(removeComponents(root, f.asset), /Invalid component path/);
  } finally { await rm(root, {recursive:true, force:true}); await rm(outside, {recursive:true, force:true}); }
});
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
    await symlink(outside,path.join(root,'assets'),process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(installComponents(root,f.bytes,f.asset),/symbolic/);
    assert.equal(await readFile(path.join(root,'index.html'),'utf8'),'original');
    await unlink(path.join(root,'assets'));
    const controller=new AbortController();controller.abort();
    await assert.rejects(installComponents(root,f.bytes,f.asset,controller.signal));
    assert.equal(await readFile(path.join(root,'index.html'),'utf8'),'original');
  } finally { await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true}); }
});
