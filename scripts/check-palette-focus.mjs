// Run only in a disposable Obsidian vault with a connected T3 workspace.
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';

const [endpoint, vault] = process.argv.slice(2);
if (!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-')) {
  throw Error('Supply a loopback CDP endpoint and a disposable fixture vault.');
}
const c = await connectDevelopmentVault(endpoint, vault);
const guest = code => c.evaluate(`app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const pause = () => new Promise(resolve => setTimeout(resolve, 200));
const palette = () => guest(`!!document.querySelector('[data-testid="command-palette"][data-open]')`);
async function escape() {
  // CDP Input targets the parent renderer even when a webview has focus.
  await c.evaluate(`(async()=>{
    const wc=require('electron').remote.webContents.getFocusedWebContents();
    if(!wc)throw Error('No focused web contents.');
    const attached=wc.debugger.isAttached();
    if(!attached)wc.debugger.attach('1.3');
    try {
      await wc.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await wc.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    } finally {if(!attached)wc.debugger.detach();}
    return true;
  })()`);
  await pause();
}
try {
  for(let attempt=0;attempt<50;attempt++) {
    const ready=await c.evaluate(`!!app.workspace.getLeavesOfType('t3-code-workspace')[0]?.view.contentEl.querySelector('webview:not(.t3-code-pending)')`);
    if(ready)break;
    if(attempt===49)throw Error('The disposable T3 workspace did not connect.');
    await pause();
  }
  const note = await c.evaluate(`(async()=>{
    const file=app.vault.getMarkdownFiles()[0];
    if(!file)throw Error('The disposable vault needs a Markdown note.');
    const leaf=app.workspace.getLeaf('tab');
    await leaf.openFile(file);
    return leaf.id;
  })()`);
  try {
    for (const mode of ['files', 'command']) {
      if (await palette()) {
        await guest(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))`);
        await pause();
      }
      await c.evaluate(`(()=>{
        const leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0];
        app.workspace.setActiveLeaf(leaf,{focus:true});
        leaf.view.contentEl.querySelector('webview').focus();
        return true;
      })()`);
      const key = mode === 'command' ? 'k' : 'p';
      await guest(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'${key}',code:'Key${key.toUpperCase()}',ctrlKey:true,bubbles:true}))`);
      await pause();
      assert.equal(await palette(), true, `${mode}: palette opened`);
      assert.equal(await guest(`document.querySelector('[data-testid="command-palette"]').dataset.paletteMode`), mode);
      const box = await c.evaluate(`(()=>{
        app.workspace.setActiveLeaf(app.workspace.getLeafById(${JSON.stringify(note)}),{focus:true});
        const leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0];
        const r=leaf.tabHeaderEl.getBoundingClientRect();
        return {x:r.x+r.width/2,y:r.y+r.height/2};
      })()`);
      await c.call('Input.dispatchMouseEvent', {type:'mousePressed', ...box, button:'left', clickCount:1});
      await c.call('Input.dispatchMouseEvent', {type:'mouseReleased', ...box, button:'left', clickCount:1});
      await pause();
      assert.equal(await palette(), true, `${mode}: switching tabs kept palette open`);
      assert.equal(await c.evaluate('app.workspace.activeLeaf.view.getViewType()'), 't3-code-workspace');
      await escape();
      const result = {
        mode,
        activeView:await c.evaluate('app.workspace.activeLeaf.view.getViewType()'),
        paletteOpen:await palette(),
      };
      console.log(JSON.stringify(result));
      assert.equal(result.activeView, 't3-code-workspace', `${mode}: Escape must stay in T3`);
      // The nested autocomplete can consume the first Escape before the dialog.
      if(result.paletteOpen)await escape();
      assert.equal(await palette(), false, `${mode}: Escape must dismiss the palette`);
      assert.equal(await c.evaluate('app.workspace.activeLeaf.view.getViewType()'), 't3-code-workspace');
    }
  } finally {
    await guest(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))`);
    await c.evaluate(`app.workspace.getLeafById(${JSON.stringify(note)})?.detach()`);
  }
} finally {
  c.close();
}
