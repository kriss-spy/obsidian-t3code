import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, renameSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AliasIndex, metadataAliases } from '../src/aliases';
import { ReferenceDrags } from '../src/references';

test('alias metadata merges canonical identities, updates, renames, duplicates and Unicode within the requested directory', async () => {
  const root=mkdtempSync(path.join(os.tmpdir(),'t3-alias-'));
  try {
    const vault=path.join(root,'vault');mkdirSync(vault);mkdirSync(path.join(vault,'nested'));
    for (const file of ['one.md','two.md','nested/空 格.md']) writeFileSync(path.join(vault,file),'fixture');
    writeFileSync(path.join(root,'outside.md'),'outside');symlinkSync(path.join(root,'outside.md'),path.join(vault,'escape.md'));
    symlinkSync(path.join(vault,'one.md'),path.join(vault,'same.md'));
    const index=new AliasIndex();
    for (const file of ['one.md','two.md','nested/空 格.md','escape.md','same.md']) index.update({path:file,aliases:['Café 空']});
    const result=await index.search(vault,vault,'CAFE\u0301 空',[{path:'same.md',kind:'file'}],80);
    assert.deepEqual(result.map(e=>e.path),['one.md','two.md','nested/空 格.md']);
    assert.deepEqual((await index.search(vault,path.join(vault,'nested'),'空',[],80)).map(e=>e.path),['空 格.md']);
    index.update({path:'two.md',aliases:['changed']});
    renameSync(path.join(vault,'one.md'),path.join(vault,'renamed.md'));index.remove('one.md');index.update({path:'renamed.md',aliases:['Café 空']});
    assert.deepEqual((await index.search(vault,vault,'café',[],80)).map(e=>e.path),['nested/空 格.md','renamed.md']);
    assert.equal((await index.search(vault,root,'café',[],80)).length,0);
    assert.deepEqual(await index.search(vault,path.join(vault,'missing'),'café',[],80),[]);
    assert.deepEqual(metadataAliases(['one',3,'',null,'空']),['one','空']);
    assert.deepEqual(metadataAliases('single'),['single']);
    for(let i=0;i<20000;i++)index.update({path:`unmatched-${i}.md`,aliases:[`other ${i}`]});
    assert.equal((await index.search(vault,vault,'café',[],1)).length,1);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('reference tokens are single-use, canonical, and reject missing or outside originals', async () => {
  const root=mkdtempSync(path.join(os.tmpdir(),'t3-drag-'));
  try {
    const vault=path.join(root,'vault');mkdirSync(vault);mkdirSync(path.join(vault,'空 folder'));writeFileSync(path.join(vault,'note.md'),'fixture');
    writeFileSync(path.join(root,'outside.md'),'outside');symlinkSync(path.join(root,'outside.md'),path.join(vault,'outside.md'));
    const drags=new ReferenceDrags();const token=drags.capture(['note.md','空 folder','outside.md','missing.md']);
    assert.deepEqual(await drags.consume(token,vault),[path.join(vault,'note.md'),path.join(vault,'空 folder')]);
    assert.deepEqual(await drags.consume(token,vault),[]);
    assert.deepEqual(await drags.consume('forged',vault),[]);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('exact alias results survive a full normal-result limit', async () => {
  const root=mkdtempSync(path.join(os.tmpdir(),'t3-alias-full-'));
  try {
    const index=new AliasIndex();mkdirSync(path.join(root,'Blue Archive'));writeFileSync(path.join(root,'Blue Archive/Blue Archive.md'),'fixture');
    index.update({path:'Blue Archive/Blue Archive.md',aliases:['蔚蓝档案']});
    const normal=[];
    for(let i=0;i<200;i++){const file=`normal-${i}.md`;writeFileSync(path.join(root,file),'fixture');normal.push({path:file,kind:'file' as const});}
    const result=await index.search(root,root,'蔚蓝档案',normal,200);
    assert.equal(result.length,200);assert.equal(result[0].path,'Blue Archive/Blue Archive.md');
    assert.equal(result[1].path,'normal-0.md');
  } finally {rmSync(root,{recursive:true,force:true});}
});
