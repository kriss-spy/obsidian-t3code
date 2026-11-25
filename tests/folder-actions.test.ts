import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { canonicalDirectory } from '../src/scope';
const nativeRequire=createRequire(import.meta.url);
const bundle=buildSync({entryPoints:['src/folder-actions.ts'],bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian']}).outputFiles[0].text;
function fixture() {
  const notices:string[]=[];const module={exports:{} as any};
  new Function('require','module','exports',bundle)((name:string)=>name==='obsidian'?{MarkdownView:class{},Notice:class{constructor(message:string){notices.push(message);}}}:nativeRequire(name),module,module.exports);
  return {...module.exports,notices};
}
test('folder note names stay inside the selected folder',()=>{
  const {folderNotePath}=fixture();const folder={path:'Parent/Child',name:'Child'};
  assert.equal(folderNotePath(folder,'{folder}.md'),'Parent/Child/Child.md');
  assert.equal(folderNotePath(folder,'index.md'),'Parent/Child/index.md');
  for(const name of ['../else.md','/outside.md','a\\b.md','', 'note.txt','bad\0.md']) assert.equal(folderNotePath(folder,name),null);
});
test('folder interception respects native default, environment, route, real directory and vault boundaries',async()=>{
  const f=fixture();const root=canonicalDirectory(await mkdtemp(path.join(tmpdir(),'folder-actions-')));
  try {
    const vault=path.join(root,'vault');await mkdir(vault);await mkdir(path.join(root,'external'));await mkdir(path.join(vault,'Child.md'));await symlink(path.join(root,'external'),path.join(vault,'escape'));await writeFile(path.join(vault,'note.md'),'note');
    const calls:string[]=[];const folder={path:'Child.md',name:'Child.md'};
    const app={vault:{getFolderByPath:(p:string)=>p==='Child.md'?folder:null,getFileByPath:()=>null},plugins:{plugins:{'notebook-navigator':{api:{navigation:{navigateToFolder:async(p:any)=>{calls.push(p.path);return true;}}}}}}};
    const request={type:'folder',id:'1',generation:'g',environmentId:'local',path:path.join(vault,'Child.md'),route:'/thread'};
    const settings={folderAction:'notebook',folderNoteName:'{folder}.md',notePlacement:'tab'};
    const run=(overrides={},config=settings,current=()=>true)=>f.handleFolderAction(app,vault,'local',{...request,...overrides},config,current);
    assert.equal(await run({}, {...settings,folderAction:'default'}),false);
    assert.equal(await run({environmentId:'remote'}),false);
    assert.equal(await run({path:'relative'}),false);
    for(const name of ['note.md','escape','missing'])assert.equal(await run({path:path.join(vault,name)}),false);
    assert.equal(await run({path:path.join(root,'external')}),false);
    assert.equal(await run({},settings,()=>false),false);assert.deepEqual(calls,[]);
    assert.equal(await run(),true);assert.deepEqual(calls,['Child.md']);
    delete (app.plugins.plugins as any)['notebook-navigator'];
    assert.equal(await run(),true);assert.match(f.notices.at(-1),/required plugin is unavailable/);
    assert.equal(await run({}, {...settings,folderAction:'note'}),true);assert.match(f.notices.at(-1),/Folder note not found/);
  } finally {await rm(root,{recursive:true,force:true});}
});
