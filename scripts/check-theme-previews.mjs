// Only disposable vaults with the review note, code file and working-tree diff open.
import assert from 'node:assert/strict';
import {writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,output]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !output)throw Error('Supply endpoint, disposable vault, and existing screenshot directory.');
const themeNames=process.argv[5]?JSON.parse(process.argv[5]):['Default','Minimal','Things','AnuPpuccin','Catppuccin'];
if(!Array.isArray(themeNames)||!themeNames.length||themeNames.some(name=>typeof name!=='string'||!name.trim()))throw Error('Theme matrix must be a nonempty JSON array of theme names.');
const themeSlug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const c=await connectDevelopmentVault(endpoint,vault);
const parent=code=>c.evaluate(code),guest=code=>parent(`document.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const pause=()=>new Promise(r=>setTimeout(r,150));
async function wait(check){for(let i=0;i<100;i++){try{if(await check())return;}catch{}await pause();}throw Error('Runtime condition timed out.');}
async function shot(name){await pause();await pause();const result=await c.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.resolve(output,name+'.png');await writeFile(file,Buffer.from(result.data,'base64'));const capture=await parent(`(async()=>{const g=document.querySelector('webview'),r=g.getBoundingClientRect(),wc=require('electron').remote.webContents.fromId(g.getWebContentsId());if(!wc.debugger.isAttached())wc.debugger.attach('1.3');wc.disableDeviceEmulation();wc.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:Math.round(r.width),height:Math.round(r.height)},deviceScaleFactor:1,viewPosition:{x:0,y:0},viewSize:{width:Math.round(r.width),height:Math.round(r.height)},scale:1});await new Promise(resolve=>setTimeout(resolve,400));const viewport=await g.executeJavaScript('innerWidth');if(viewport!==Math.round(r.width))throw Error('Guest screenshot viewport mismatch: '+viewport+' vs '+r.width);const image=await wc.capturePage();return {image:image.toPNG().toString('base64'),x:r.x,y:r.y,width:r.width,height:r.height}})()`);await writeFile(file+'.guest.png',Buffer.from(capture.image,'base64'));const {execFileSync}=await import('node:child_process');execFileSync('python3',['-c','from PIL import Image;import sys; p=Image.open(sys.argv[1]);g=Image.open(sys.argv[1]+".guest.png");g=g.resize((int(float(sys.argv[4])),int(float(sys.argv[5]))));p.paste(g,(int(float(sys.argv[2])),int(float(sys.argv[3]))));p.save(sys.argv[1])',file,String(capture.x),String(capture.y),String(capture.width),String(capture.height)]);await unlink(file+'.guest.png');return file;}
const report={checkedAt:new Date().toISOString(),matrix:[]};
const click=label=>guest(`(()=>{document.querySelector('button[aria-label='+${JSON.stringify(JSON.stringify(label))}+']').click();return true})()`);
const tab=name=>guest(`(()=>{[...document.querySelectorAll('[data-active-tab] button')].find(b=>b.textContent===${JSON.stringify(name)}).click();return true})()`);
try{
 await c.call('Emulation.setDeviceMetricsOverride',{width:2100,height:1200,deviceScaleFactor:1,mobile:false});
 await parent(`(()=>{const g=document.querySelector('webview'),r=g.getBoundingClientRect(),wc=require('electron').remote.webContents.fromId(g.getWebContentsId());wc.disableDeviceEmulation();wc.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:Math.round(r.width),height:Math.round(r.height)},deviceScaleFactor:1,viewPosition:{x:0,y:0},viewSize:{width:Math.round(r.width),height:Math.round(r.height)},scale:1});return true})()`);await pause();await pause();
 await parent('app.plugins.plugins.threecode.setFollowTheme(true).then(()=>true)');
 // Fixture has a real working-tree diff and the note preview open in the right panel.
 await guest(`(()=>{const b=document.querySelector('button[aria-label="Toggle terminal drawer"]');if(b?.getAttribute('aria-pressed')==='true')b.click();return true})()`);
 for(const theme of themeNames)for(const appearance of ['light','dark']){
  await parent(`(async()=>{app.customCss.setTheme(${JSON.stringify(theme==='Default'?'':theme)});await app.customCss.loadTheme();app.changeTheme(${JSON.stringify(appearance==='dark'?'obsidian':'moonstone')});return true})()`);
  await wait(async()=>await guest(`document.documentElement.classList.contains('dark')===${appearance==='dark'}`));await pause();await pause();
  await tab('Diff');await pause();await guest(`(()=>{document.querySelector('button[aria-label="Expand theme-review.ts"]')?.click();return true})()`);await pause();
  const diff=await shot(themeSlug(theme)+'-'+appearance+'-diff');
  const diffText=await guest(`[...document.querySelectorAll('diffs-container')].map(e=>e.shadowRoot?.querySelector('pre')?.textContent??'').join(' ')`);
  assert(diffText.includes('Resolved Obsidian')&&diffText.includes('Representative code preview'));
  await tab('Theme review.md');await pause();
  if(await guest(`!!document.querySelector('button[aria-label="Show rendered markdown"]')`))await click('Show rendered markdown');
  await wait(async()=>await guest(`!!document.querySelector('button[aria-label="Show markdown source"]')`));
  const markdown=await shot(themeSlug(theme)+'-'+appearance+'-markdown');
  await click('Refresh workspace files');await pause();await pause();
  await guest(`(()=>{document.querySelector('file-tree-container').shadowRoot.querySelector('[data-item-path="theme-review.ts"]').click();return true})()`);
  await wait(async()=>await guest(`!!document.querySelector('button[aria-label="Close theme-review.ts"]')`));
  const code=await shot(themeSlug(theme)+'-'+appearance+'-code');
  const codeText=await guest(`[...document.querySelectorAll('diffs-container')].map(e=>e.shadowRoot?.querySelector('pre')?.textContent??'').join(' ')`);
  assert(codeText.includes('Updated semantic colors'));
  report.matrix.push({theme,appearance,diff,markdown,code,diffTextPresent:true,codeTextPresent:true});
 }
 await writeFile(path.join(output,'preview-runtime.json'),JSON.stringify(report,null,2)+'\n');console.log('Verified '+report.matrix.length+' preview and diff theme/appearance combinations.');
}finally{c.close();}
