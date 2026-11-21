// Operates only on disposable integration vaults. Pair through T3 before running.
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { connectDevelopmentVault } from './obsidian-cdp.mjs';
const [endpoint,vault,includedRoute,excludedRoute,output] = process.argv.slice(2);
if (!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !includedRoute || !excludedRoute || !output) throw new Error('Usage: node scripts/check-supported-vault.mjs <CDP endpoint> <disposable vault> <included route> <excluded route> <evidence.json>');
const c=await connectDevelopmentVault(endpoint,vault);
const parent=code=>c.evaluate(code);
const guest=code=>parent(`app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const evidence={platform:'Linux',checks:{}};
async function waitFor(code) {for(let attempt=0;attempt<100;attempt++){if(await guest(code))return;await new Promise(r=>setTimeout(r,100));}throw Error('Guest condition timed out: '+code);}
async function route(target){await parent(`(async()=>{const leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0];await app.workspace.revealLeaf(leaf);app.workspace.setActiveLeaf(leaf,{focus:true});await leaf.view.setState({target:${JSON.stringify(target)}},{});return true})()`);}
try {
  await parent(`(async()=>{window.__integrationLeaks=0;const v=app.workspace.getLeavesOfType('t3-code-workspace')[0].view;const attach=g=>{g.addEventListener('console-message',e=>{if(e.message==='INTEGRATION_SCOPE_LEAK')window.__integrationLeaks++});const code=\`(()=>{const check=()=>{if(/EXCLUDED_SENTINEL|EXCLUDED sibling fixture|Excluded project/.test(document.body.textContent))console.info('INTEGRATION_SCOPE_LEAK')};check();new MutationObserver(check).observe(document.body,{subtree:true,childList:true,characterData:true})})()\`;g.addEventListener('dom-ready',()=>g.executeJavaScript(code).catch(()=>{}));return g.executeJavaScript(code).catch(()=>{})};window.__integrationObserver?.disconnect();window.__integrationObserver=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n.tagName==='WEBVIEW')attach(n)});__integrationObserver.observe(v.contentEl,{childList:true});await attach(v.contentEl.querySelector('webview'));return true})()`);
  await route(includedRoute);
  await waitFor(`!!document.querySelector('a.chat-markdown-file-link')`);
  assert.deepEqual(await guest(`({require:typeof require,process:typeof process})`),{require:'undefined',process:'undefined'});
  const security=await parent(`(()=>{const g=app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview');const p=require('electron').remote.webContents.fromId(g.getWebContentsId()).getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,webSecurity:p.webSecurity,nodeIntegration:p.nodeIntegration}})()`);
  assert.deepEqual(security,{sandbox:true,contextIsolation:true,webSecurity:true,nodeIntegration:false});evidence.checks.realGuestIsolation=security;
  await guest(`document.querySelector('a.chat-markdown-file-link').dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true,cancelable:true}))`);
  for(let i=0;i<30;i++){if(await parent(`app.workspace.getLeavesOfType('markdown').some(l=>l.view.file?.path==='Test 空 格#.md')`))break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(await parent(`app.workspace.getLeavesOfType('markdown').some(l=>l.view.file?.path==='Test 空 格#.md')`),true);evidence.checks.realVaultChip=true;
  await parent(`app.plugins.plugins['t3-code'].openWorkspace().then(()=>true)`);
  await waitFor(`[...document.querySelectorAll('a.chat-markdown-file-link')].some(e=>e.textContent.includes('External'))`);
  await guest(`[...document.querySelectorAll('a.chat-markdown-file-link')].find(e=>e.textContent.includes('External')).dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true,cancelable:true}))`);
  await new Promise(r=>setTimeout(r,400));
  assert.equal(await parent(`app.workspace.getLeavesOfType('markdown').some(l=>l.view.file?.path?.startsWith('file:/')&&l.view.editor.getCursor().line===1)`),true);evidence.checks.realExternalChipLine2=true;
  await parent(`app.plugins.plugins['t3-code'].openWorkspace().then(()=>true)`);
  await waitFor(`!!document.querySelector('button[aria-label="Filter threads by project"]')`);
  await guest(`document.querySelector('button[aria-label="Filter threads by project"]').click()`);
  await waitFor(`document.body.textContent.includes('All projects')`);
  assert.equal(await guest(`document.body.textContent.includes('Excluded project')`),false);evidence.checks.projectChoicesExcludeSibling=true;
  await guest(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await guest(`(()=>{const i=document.querySelector('input[aria-label="Search threads"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'INCLUDED');i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  await waitFor(`!!document.querySelector('button[aria-label="INCLUDED vault fixture, Vault project"]')`);evidence.checks.searchPositiveIncluded=true;
  await guest(`(()=>{const i=document.querySelector('input[aria-label="Search threads"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'EXCLUDED');i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  await waitFor(`document.body.textContent.includes('No threads found')`);evidence.checks.searchNegativeExcluded=true;
  await route(excludedRoute);
  await waitFor(`document.body.textContent.includes('This session is outside this vault.')`);evidence.checks.excludedRestoredRoute=true;
  await parent(`app.workspace.getLeavesOfType('t3-code-workspace')[0].view.connect()`);
  await waitFor(`document.body.textContent.includes('This session is outside this vault.')`);evidence.checks.excludedReconnect=true;
  assert.equal(await parent('window.__integrationLeaks'),0);evidence.checks.excludedDomObservations=0;
  await route(includedRoute);await waitFor(`!!document.querySelector('a.chat-markdown-file-link')`);
  const count=await parent(`(async()=>{await Promise.all(Array.from({length:6},()=>app.plugins.plugins['t3-code'].openWorkspace()));return app.workspace.getLeavesOfType('t3-code-workspace').length})()`);assert.equal(count,1);evidence.checks.concurrentOpenOneView=true;
  evidence.checkedAt=new Date().toISOString();await writeFile(output,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
} finally {c.close();}
