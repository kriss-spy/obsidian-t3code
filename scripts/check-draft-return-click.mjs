// Verify native header actions and note menus under the supplied installed themes.
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,...requestedThemes]=process.argv.slice(2);
if(!vault||!path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-'))throw Error('Supply a disposable fixture vault.');
const c=await connectDevelopmentVault(endpoint,vault);
const pause=()=>new Promise(resolve=>setTimeout(resolve,50));
async function mouseClick(box) {
 assert(box&&box.width>0&&box.height>0&&box.hit,'Native control must be visible and receive the click: '+JSON.stringify(box));
 for(const type of ['mousePressed','mouseReleased'])await c.call('Input.dispatchMouseEvent',{type,x:box.x,y:box.y,button:'left',clickCount:1});
}
const boxCode=`element=>{if(!element)return null;const r=element.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,hit:!!target&&(target===element||element.contains(target))}}`;
async function cleanup() {
 await c.evaluate(`(async()=>{const state=window.draftReturnClick;if(!state)return true;const p=app.plugins.plugins.threecode;if(p.draftNotes.has(state.file))await p.draftNotes.finish(state.view,true);if(await app.vault.adapter.exists(state.file.path)){state.view.leaf.detach();await app.vault.delete(state.file);}delete window.draftReturnClick;return true})()`);
}
const results=[];
try {
 const originalTheme=await c.evaluate('app.customCss.theme');
 try {
  for(const theme of requestedThemes.length?requestedThemes:[originalTheme]) {
   await c.evaluate(`(async()=>{app.customCss.setTheme(${JSON.stringify(theme==='default'?'':theme)});await app.customCss.loadTheme();return true})()`);
   for(const mode of ['return','cancel','menu']) {
    await c.evaluate(`(async()=>{window.draftReturnClick={};const p=app.plugins.plugins.threecode,leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0];
     await p.draftNotes.open({leaf,current:()=>true,focus:async()=>{},bridge:{beginDraft:async()=>({id:crypto.randomUUID(),text:'Preserve this draft',cwd:app.vault.adapter.getBasePath()}),returnDraft:async(id,text)=>{window.draftReturnClick.returned=text;},cancelDraft:async()=>{window.draftReturnClick.canceled=true;}}});
     await new Promise(resolve=>setTimeout(resolve,250));const view=app.workspace.activeLeaf.view;window.draftReturnClick.view=view;window.draftReturnClick.file=view.file;
     if(view.contentEl.querySelector('.t3-code-draft-actions'))throw Error('The in-note toolbar must be removed.');return true;})()`);
    if(mode==='menu') {
     const more=await c.evaluate(`(${boxCode})(window.draftReturnClick.view.containerEl.querySelector('.view-header [aria-label="More options"], .view-header .view-header-more-options'))`);
     await mouseClick(more);await pause();
     const item=await c.evaluate(`(${boxCode})([...document.querySelectorAll('.menu-item')].find(e=>e.querySelector('.menu-item-title')?.textContent==='Return draft to T3 Code'))`);
     await mouseClick(item);
    } else {
     const box=await c.evaluate(`(${boxCode})(window.draftReturnClick.view.containerEl.querySelector('[data-t3-draft-action="${mode}"]'))`);
     await mouseClick(box);
    }
    let done=false;
    for(let i=0;i<60;i++) {
     done=await c.evaluate(mode==='cancel'?`window.draftReturnClick.canceled&&!app.plugins.plugins.threecode.draftNotes.has(window.draftReturnClick.file)`:`window.draftReturnClick.returned==='Preserve this draft'&&!app.vault.getFileByPath(window.draftReturnClick.file.path)`);
     if(done)break;await pause();
    }
    assert(done,theme+' '+mode+' must complete through the native control');
    if(mode==='cancel')assert.equal(await c.evaluate('window.draftReturnClick.returned'),undefined);
    await cleanup();
   }
   results.push({theme,nativeReturn:true,nativeCancel:true,noteMenu:true,customToolbar:false});
  }
 }finally{await c.evaluate(`(async()=>{app.customCss.setTheme(${JSON.stringify(originalTheme)});await app.customCss.loadTheme();return true})()`);}
 console.log(JSON.stringify({results},null,2));
}finally{await cleanup();c.close();}
