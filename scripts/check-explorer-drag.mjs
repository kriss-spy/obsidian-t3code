// Trusted mouse source plus Chromium drag delivery in a disposable Obsidian profile.
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { connectDevelopmentVault } from './obsidian-cdp.mjs';
const [endpoint,vault,filePath,folderPath,output]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !filePath || !folderPath || !output)throw Error('Supply endpoint, disposable vault, note path, folder path, and output.');
const c=await connectDevelopmentVault(endpoint,vault);
const expectedProfile=path.join(path.dirname(vault),'profile');
try {
  const results=[];
  for(const [kind,sourcePath] of [['file',filePath],['folder',folderPath]]) {
    for(let attempt=0;attempt<100;attempt++){
      const ready=await c.evaluate(`(()=>{const g=app.workspace.getLeavesOfType('t3-code-workspace')[0]?.view.contentEl.querySelector('webview');return g?g.executeJavaScript('!!document.querySelector("[data-chat-composer-form]")'):false})()`);
      if(ready)break;
      if(attempt===99)throw Error('Composer unavailable');
      await new Promise(r=>setTimeout(r,100));
    }
    const result=await c.evaluate(`(async()=>{
      const e=require('electron').remote;
      if(e.app.getPath('userData')!==${JSON.stringify(expectedProfile)})throw Error('Wrong disposable profile');
      const leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0];await app.workspace.revealLeaf(leaf);app.workspace.setActiveLeaf(leaf,{focus:true});
      const win=e.getCurrentWindow();win.show();win.focus();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const g=leaf.view.contentEl.querySelector('webview');
      const read=()=>g.executeJavaScript('({text:document.querySelector("[data-testid=composer-editor]")?.innerText,route:location.pathname,messages:document.querySelectorAll("[data-message-id]").length,rect:document.querySelector("[data-chat-composer-form]")?.getBoundingClientRect().toJSON()})');
      let before;
      for(let i=0;i<30;i++){
        await app.workspace.revealLeaf(leaf);app.workspace.setActiveLeaf(leaf,{focus:true});
        await new Promise(r=>setTimeout(r,100));before=await read();
        if(before.rect?.width>0 && before.rect?.height>0 && app.workspace.activeLeaf===leaf)break;
        if(i===29)throw Error('Visible composer unavailable');
      }
      const row=document.querySelector('.workspace-split.mod-right-split .nav-${kind}-title[data-path="'+CSS.escape(${JSON.stringify(sourcePath)})+'"]');
      if(!row)throw Error('Explorer source unavailable');row.scrollIntoView({block:'nearest'});
      const r=row.getBoundingClientRect(),box=g.getBoundingClientRect();
      const start={x:Math.round(r.x+Math.min(100,r.width/2)),y:Math.round(r.y+r.height/2)};
      const end={x:Math.round(box.x+before.rect.x+before.rect.width/2),y:Math.round(box.y+before.rect.y+before.rect.height/2)};
      const wc=win.webContents;
      const alreadyAttached=wc.debugger.isAttached();if(!alreadyAttached)wc.debugger.attach('1.3');
      await wc.debugger.sendCommand('Input.cancelDragging');
      wc.sendInputEvent({type:'keyDown',keyCode:'Escape'});wc.sendInputEvent({type:'keyUp',keyCode:'Escape'});
      let payload=null;
      const sourceDrag=event=>{payload={items:[...event.dataTransfer.types].map(mimeType=>({mimeType,data:event.dataTransfer.getData(mimeType)})),dragOperationsMask:1};};
      document.addEventListener('dragstart',sourceDrag);
      wc.sendInputEvent({type:'mouseMove',...start});wc.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,80));
      let zoneObserved=false;
      for(let i=1;i<=20;i++){
        wc.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*i/20),y:Math.round(start.y+(end.y-start.y)*i/20),button:'left'});
        await new Promise(r=>setTimeout(r,20));
        zoneObserved ||= !!document.querySelector('.t3-code-reference-drop');
      }
      for(const type of ['dragEnter','dragOver','drop'])await wc.debugger.sendCommand('Input.dispatchDragEvent',{type,...end,data:payload??{items:[],dragOperationsMask:1}});
      wc.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});
      await wc.debugger.sendCommand('Input.cancelDragging');document.removeEventListener('dragstart',sourceDrag);if(!alreadyAttached)wc.debugger.detach();
      await new Promise(r=>setTimeout(r,600));
      const after=await read();
      return {kind:${JSON.stringify(kind)},source:${JSON.stringify(sourcePath)},zoneObserved,textChanged:after.text!==before.text,referencePresent:after.text.includes(${JSON.stringify(path.basename(sourcePath).replace(/\.md$/i,''))}),routePreserved:after.route===before.route,messagesPreserved:after.messages===before.messages,workspaceStillActive:app.workspace.activeLeaf===leaf,zonesRemaining:document.querySelectorAll('.t3-code-reference-drop').length};
    })()`);
    console.log(JSON.stringify(result));
    assert.equal(result.zoneObserved,true);assert.equal(result.textChanged,true);assert.equal(result.referencePresent,true);assert.equal(result.routePreserved,true);assert.equal(result.messagesPreserved,true);assert.equal(result.workspaceStillActive,true);assert.equal(result.zonesRemaining,0);
    results.push(result);
  }
  await writeFile(output,JSON.stringify({method:'Electron trusted mouse source and Chromium Input.dispatchDragEvent delivery to host composer drop target',results},null,2)+'\n');
  console.log('Passed trusted note and folder explorer drags.');
} finally {c.close();}
