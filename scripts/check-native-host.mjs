// Run only against a disposable vault containing Mac test 空 格.md.
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { connectDevelopmentVault } from './obsidian-cdp.mjs';
const [endpoint, vault, output] = process.argv.slice(2);
if (!vault || !output || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-')) throw Error('Supply a CDP endpoint, disposable vault, and evidence path.');
const connection = await connectDevelopmentVault(endpoint, vault);
try {
  const result = await connection.evaluate(String.raw`(async()=>{
const root=${JSON.stringify(vault)};
if(app.vault.adapter.getBasePath()!==root)throw Error('Wrong vault');
const p=app.plugins.plugins.threecode;
const leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0],v=leaf.view;
const env=v.bridge.session.localEnvironmentId;
const opened=await p.openMarkdown({type:'file',id:'macos-fixture',generation:v.bridge.session.generation,environmentId:env,path:root+'/Mac test 空 格.md',line:5,column:1,newTab:false},env,()=>true,leaf);
if(!opened)throw Error('Markdown declined');
const md=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path==='Mac test 空 格.md');
if(!md||md.view.editor.getCursor().line!==4)throw Error('Markdown or cursor missing');
const before=md.view.editor.getValue();
md.view.editor.setValue(before+'\nMACOS_UNSAVED_CONTEXT\n');
const cmd=app.commands.commands['threecode:add-note'];cmd.editorCallback(md.view.editor,md.view);
await new Promise(r=>setTimeout(r,1000));
md.view.editor.setValue(before);await app.vault.modify(md.view.file,before);
const g=v.contentEl.querySelector('webview');
const text=await g.executeJavaScript('document.body.innerText');
if(!text.includes('MACOS_UNSAVED_CONTEXT'))throw Error('Command context missing');
const prefs=require('electron').remote.webContents.fromId(g.getWebContentsId()).getLastWebPreferences();
const globals=await g.executeJavaScript('({require:typeof require,process:typeof process})');
if(!prefs.sandbox||!prefs.contextIsolation||!prefs.webSecurity||prefs.nodeIntegration||globals.require!=='undefined'||globals.process!=='undefined')throw Error('Guest isolation');
await Promise.all([p.openWorkspace(),p.openWorkspace()]);
if(app.workspace.getLeavesOfType('t3-code-workspace').length!==1)throw Error('Duplicate views');
await v.connect();
for(let i=0;i<100&&!p.diagnostic.includes('Local vault access verified.');i++)await new Promise(r=>setTimeout(r,100));
if(!p.diagnostic.includes('Local vault access verified.'))throw Error(p.diagnostic);
const after=await v.contentEl.querySelector('webview').executeJavaScript('document.body.innerText');
if(!after.includes('MACOS_UNSAVED_CONTEXT'))throw Error('Draft lost on reconnect');
const fs=require('fs');
if(fs.readdirSync(root+'/.obsidian').some(f=>f.startsWith('t3-code-host-')))throw Error('Proof file leaked');
if(fs.readdirSync(require('os').tmpdir()).some(f=>f.startsWith('t3-code-machine-')))throw Error('Machine proof leaked');
return {platform:process.platform,arch:process.arch,obsidian:app.version,diagnostic:p.diagnostic,checks:{nativeMarkdownUnicodePath:true,line5:true,unsavedNoteCommandContext:true,guestIsolation:{sandbox:prefs.sandbox,contextIsolation:prefs.contextIsolation,webSecurity:prefs.webSecurity,nodeIntegration:prefs.nodeIntegration,...globals},singleView:true,reconnect:true,draftPreserved:true,proofCleanup:true},checkedAt:new Date().toISOString()};
})()
`);
  await writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally { connection.close(); }
