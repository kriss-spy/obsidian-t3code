// Immediate teardown must preserve a new draft before T3's storage debounce expires.
import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,output,startRoute]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !output)throw Error('Supply CDP, a disposable fixture vault, and an evidence path.');
const c=await connectDevelopmentVault(endpoint,vault);
const inspect=`({route:location.pathname,text:document.querySelector('[data-testid="composer-editor"]')?.innerText,messages:document.querySelectorAll('[data-message-id]').length})`;
const state=()=>c.evaluate(`(async()=>{const v=app.workspace.getLeavesOfType('t3-code-workspace')[0]?.view;const g=v?.contentEl.querySelector('webview:not(.t3-code-pending)');return g?await g.executeJavaScript(${JSON.stringify(inspect)}):null})()`);
async function restored(route,text) {
  for(let i=0;i<120;i++) {
    const value=await state();
    if(value?.text?.includes(text)) {assert.equal(value.route,route);assert.equal(value.messages,0);return value;}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('Draft was not restored: '+JSON.stringify(await state()));
}
const evidence={platform:'Linux',obsidian:'1.15.1',checks:{}};
try {
  if(startRoute)await c.evaluate(`(async()=>{const v=await app.plugins.plugins['t-three-code-workspace'].openWorkspace();await v.setState({target:${JSON.stringify(startRoute)}},{});return true})()`);
  for(let i=0;i<120;i++) {
    if((await state())?.text!==undefined)break;
    if(i===119)throw Error('Start from a paired in-vault thread with a ready composer.');
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const first=await c.evaluate(`(async()=>{const p=app.plugins.plugins['t-three-code-workspace'];const v=await p.openWorkspace();const folder='Release lifecycle '+Date.now();await app.vault.createFolder(folder);await v.openProject(p.vaultRoot+'/'+folder);await v.appendContext('RELEASE_IMMEDIATE_RECONNECT');const before=await v.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(inspect)});await v.connect();return before})()`);
  assert(first.text.includes('RELEASE_IMMEDIATE_RECONNECT'));
  evidence.checks.immediateNewDraftReconnect=await restored(first.route,'RELEASE_IMMEDIATE_RECONNECT');
  await c.evaluate(`(async()=>{const v=await app.plugins.plugins['t-three-code-workspace'].openWorkspace();await v.appendContext('RELEASE_IMMEDIATE_TAB_CLOSE');await v.leaf.detach();await app.plugins.plugins['t-three-code-workspace'].openWorkspace();return true})()`);
  evidence.checks.immediateTabClose=await restored(first.route,'RELEASE_IMMEDIATE_TAB_CLOSE');
  const disabled=await c.evaluate(`(async()=>{const v=await app.plugins.plugins['t-three-code-workspace'].openWorkspace();await v.appendContext('RELEASE_IMMEDIATE_DISABLE');await app.plugins.disablePlugin('t-three-code-workspace');return {guests:document.querySelectorAll('.t3-code-guest').length,dropZones:document.querySelectorAll('.t3-code-reference-drop').length}})()`);
  assert.deepEqual(disabled,{guests:0,dropZones:0});evidence.checks.disabledCleanup=disabled;
  await c.evaluate(`(async()=>{await app.plugins.enablePlugin('t-three-code-workspace');await app.plugins.plugins['t-three-code-workspace'].openWorkspace();return true})()`);
  evidence.checks.immediateDisableEnable=await restored(first.route,'RELEASE_IMMEDIATE_DISABLE');
  assert.equal(await c.evaluate(`app.workspace.getLeavesOfType('t3-code-workspace').length`),1);
  evidence.checks.singleWorkspaceAfterReload=true;
  evidence.checkedAt=new Date().toISOString();
  await writeFile(output,JSON.stringify(evidence,null,2)+'\n');
  console.log('Passed immediate reconnect, tab-close, disable/enable, and cleanup checks.');
} finally{c.close();}
