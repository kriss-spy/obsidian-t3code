// Only disposable vaults. Capture the Electron opener without launching the user's browser.
import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,output]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !output)throw Error('Supply CDP, a disposable vault, and an evidence path.');
const c=await connectDevelopmentVault(endpoint,vault);
const guest=code=>c.evaluate(`app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const target='http://127.0.0.1:39176/.well-known/t3/environment?fixture=1#fragment';
async function wait(code,host=false){for(let i=0;i<100;i++){if(await(host?c.evaluate(code):guest(code)))return;await new Promise(r=>setTimeout(r,100));}throw Error('HTTP link condition timed out: '+code);}
const link=`[...document.querySelectorAll('a')].find(a=>a.textContent==='HTTP bridge fixture')`;
async function rightClick(){
 const point=await guest(`(()=>{const a=${link};a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();return {x:Math.round(r.x+10),y:Math.round(r.y+r.height/2)}})()`);
 await c.evaluate(`(()=>{const g=app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview');g.focus();const contents=require('electron').remote.webContents.fromId(g.getWebContentsId());for(const type of ['mouseDown','mouseUp'])contents.sendInputEvent({type,x:${point.x},y:${point.y},button:'right',clickCount:1});return true})()`);
}
const checks={};
try {
 await c.evaluate(`app.plugins.plugins['threecode'].openWorkspace().then(()=>true)`);
 await wait(`!!document.querySelector('[data-chat-composer-form]')`);
 await guest(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
 await wait(`!document.querySelector('[data-testid="project-file-picker"] input')`);
 await guest(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',code:'KeyP',ctrlKey:true,bubbles:true}))`);
 await wait(`!!document.querySelector('[data-testid="project-file-picker"] input')`);
 await guest(`(()=>{const input=document.querySelector('[data-testid="project-file-picker"] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'HTTP link fixture');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
 await wait(`[...document.querySelectorAll('[role="option"]')].some(e=>e.textContent.includes('HTTP link fixture.md'))`);
 await guest(`[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent.includes('HTTP link fixture.md')).click()`);
 await wait(`document.querySelector('[data-file-breadcrumbs]')?.textContent.includes('HTTP link fixture.md')`);
 await guest(`document.querySelector('button[aria-label="Show rendered markdown"]')?.click()`);
 await wait(`!!(${link})`);
 await c.evaluate(`(()=>{const shell=require('electron').shell;window.__httpOpened=[];window.__httpOriginal=shell.openExternal;shell.openExternal=async url=>{window.__httpOpened.push(url);};return true})()`);
 const route=await guest('location.pathname');
 await guest(`(${link}).click()`);
 await wait('window.__httpOpened.length===1',true);checks.normalClick=true;
 await guest(`(${link}).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}))`);
 await wait('window.__httpOpened.length===2',true);checks.ctrlClick=true;
 await rightClick();
 await wait(`[...document.querySelectorAll('[role="menuitem"]')].some(e=>e.textContent==='Open in system browser')`);
 await guest(`[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent==='Open in system browser').click()`);
 await wait('window.__httpOpened.length===3',true);checks.systemBrowserMenu=true;
 assert.deepEqual(await c.evaluate('window.__httpOpened'),[target,target,target]);checks.exactUrlQueryAndFragment=true;
 assert.equal(await guest('location.pathname'),route);checks.threadRoutePreserved=true;
 await rightClick();
 await wait(`[...document.querySelectorAll('[role="menuitem"]')].some(e=>e.textContent==='Open in integrated browser')`);
 await guest(`[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent==='Open in integrated browser').click()`);
 await wait(`document.querySelector('input[aria-label="Search or enter URL"]')?.value.includes('127.0.0.1:39176/.well-known/t3/environment')`);
 assert.equal(await c.evaluate('window.__httpOpened.length'),3);checks.integratedBrowserMenuRetained=true;
 const security=await c.evaluate(`(()=>{const g=app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview');const p=require('electron').remote.webContents.fromId(g.getWebContentsId()).getLastWebPreferences();return {allowpopups:g.hasAttribute('allowpopups'),sandbox:p.sandbox,contextIsolation:p.contextIsolation,webSecurity:p.webSecurity,nodeIntegration:p.nodeIntegration}})()`);
 assert.deepEqual(security,{allowpopups:false,sandbox:true,contextIsolation:true,webSecurity:true,nodeIntegration:false});
 await writeFile(output,JSON.stringify({checkedAt:new Date().toISOString(),platform:'Linux',obsidian:'1.15.1',checks,security,limit:'Electron shell.openExternal was captured at the host boundary. Opening an actual OS browser window requires the user check.'},null,2)+'\n');
 console.log('Passed normal click, Ctrl-click, system-browser menu, integrated-browser routing, and guest isolation checks.');
} finally {
 await c.evaluate(`(()=>{if(window.__httpOriginal){require('electron').shell.openExternal=window.__httpOriginal;delete window.__httpOriginal;}delete window.__httpOpened;return true})()`).catch(()=>{});
 c.close();
}
