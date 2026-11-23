// Run against a disposable Obsidian vault with the candidate plugin and a paired T3 workspace.
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';

const [endpoint,vault] = process.argv.slice(2);
if (!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-')) {
  throw Error('Supply a loopback CDP endpoint and a disposable fixture vault.');
}
const c = await connectDevelopmentVault(endpoint,vault);
const view = `app.workspace.getLeavesOfType('t3-code-workspace')[0].view`;
const guest = code => c.evaluate(`${view}.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const pause = () => new Promise(resolve => setTimeout(resolve,100));
const inGuest = () => c.evaluate(`document.activeElement === ${view}.contentEl.querySelector('webview')`);
const palette = () => guest(`!!document.querySelector('[data-testid="command-palette"][data-open]')`);
async function focusComposer() {
  await c.evaluate(`${view}.contentEl.querySelector('webview').focus()`);
  await guest(`document.querySelector('[data-testid="composer-editor"]').focus()`);
  await pause();
  assert.equal(await inGuest(),true);
}
async function press(key,modifiers=0) {
  await c.evaluate(`(async()=>{
    const wc=require('electron').remote.webContents.getFocusedWebContents();
    if(!wc)throw Error('No focused web contents');
    const attached=wc.debugger.isAttached();
    if(!attached)wc.debugger.attach('1.3');
    try {
      for(const type of ['keyDown','keyUp'])await wc.debugger.sendCommand('Input.dispatchKeyEvent',{
        type,key:${JSON.stringify(key)},code:${JSON.stringify(key === 'Escape' ? 'Escape' : 'Key'+key.toUpperCase())},
        windowsVirtualKeyCode:${key === 'Escape' ? 27 : key.toUpperCase().charCodeAt(0)},modifiers:${modifiers}
      });
    } finally {if(!attached)wc.debugger.detach();}
  })()`);
  await pause();
}

try {
  await c.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await pause();
  for (let attempt=0;attempt<100;attempt++) {
    if (await c.evaluate(`!!${view}.contentEl.querySelector('webview:not(.t3-code-pending)')`)) break;
    if(attempt===99)throw Error('T3 workspace did not connect');
    await pause();
  }
  await focusComposer();
  await press('Escape');
  assert.equal(await inGuest(),false,'unused Escape must return focus to Obsidian');
  assert.equal(await c.evaluate('app.workspace.activeLeaf.view.getViewType()'),'t3-code-workspace');
  await press('p',2);
  assert.equal(await c.evaluate(`!!document.querySelector('.prompt')`),true,'Ctrl+P must open Obsidian palette');
  assert.equal(await palette(),false,'T3 palette must stay closed');
  await press('Escape');
  await new Promise(resolve=>setTimeout(resolve,300));

  // Use a real click through the host renderer to restore guest focus.
  const box = await c.evaluate(`(async()=>{
    const g=${view}.contentEl.querySelector('webview'),r=g.getBoundingClientRect();
    const b=await g.executeJavaScript(${JSON.stringify(`(()=>{const r=document.querySelector('[data-testid="composer-editor"]').getBoundingClientRect();return {x:r.x+20,y:r.y+10}})()`)});
    return {x:r.x+b.x,y:r.y+b.y};
  })()`);
  await c.call('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});
  await c.call('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
  await pause();
  assert.equal(await inGuest(),true,'clicking composer must restore T3 focus');
  await press('p',2);
  assert.equal(await palette(),true,'Ctrl+P in composer must open T3 palette');
  for(let attempt=0;await palette() && attempt<3;attempt++) {
    await press('Escape');
    assert.equal(await inGuest(),true,'dismissing T3 palette must retain T3 focus');
  }
  assert.equal(await palette(),false);
  await press('Escape');
  assert.equal(await inGuest(),false,'next unused Escape must return focus to Obsidian');

  for (const mode of ['preventDefault','stopPropagation','latePreventDefault','popup','terminal','ime','repeat','modified']) {
    await focusComposer();
    await guest(`(()=>{
      const editor=document.querySelector('[data-testid="composer-editor"]');
      const mode=${JSON.stringify(mode)};
      let extra;
      if(mode==='popup') {extra=document.createElement('div');extra.role='listbox';extra.textContent='Fixture popup';document.body.append(extra);}
      if(mode==='terminal')editor.setAttribute('data-terminal-owner','drawer');
      const target=mode==='latePreventDefault'?window:editor;
      const handler=e=>{if(e.key==='Escape') {
        if(mode==='preventDefault'||mode==='latePreventDefault')e.preventDefault();
        if(mode==='stopPropagation')e.stopPropagation();
        if(mode==='popup')extra.remove();
      }};
      target.addEventListener('keydown',handler);
      const event=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true,
        isComposing:mode==='ime',repeat:mode==='repeat',shiftKey:mode==='modified'});
      editor.dispatchEvent(event);
      target.removeEventListener('keydown',handler);
      editor.removeAttribute('data-terminal-owner');
      extra?.remove();
    })()`);
    await pause();
    assert.equal(await inGuest(),true,mode+' must retain T3 focus');
  }
  await press('Escape');
  assert.equal(await inGuest(),false,'fallback must still work after consumed Escape');
  console.log('Passed native Escape → Obsidian Ctrl+P, composer click → T3 Ctrl+P, palette dismissal, and consumed Escape/terminal/IME guards.');
} finally {await c.call('Emulation.clearDeviceMetricsOverride',{});c.close();}
