// Run against a disposable, already paired development vault with a real review thread open.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { connectDevelopmentVault } from './obsidian-cdp.mjs';
const [endpoint,vault,output,sourcesFile]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !output || !sourcesFile)throw Error('Supply endpoint, disposable vault, screenshot directory and pinned theme sources.');
const themeNames=process.argv[6]?JSON.parse(process.argv[6]):['Default','Minimal','Things','AnuPpuccin','Catppuccin'];
if(!Array.isArray(themeNames)||!themeNames.length||themeNames.some(name=>typeof name!=='string'||!name.trim()))throw Error('Theme matrix must be a nonempty JSON array of theme names.');
const themeSlug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const c=await connectDevelopmentVault(endpoint,vault);
const parent=code=>c.evaluate(code);
const guest=code=>parent(`app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const pause=()=>new Promise(r=>setTimeout(r,100));
async function wait(check){for(let i=0;i<100;i++){if(await check())return;await pause();}throw Error('Theme runtime condition timed out.');}
const normalize=`color=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1,1);return '#'+[...x.getImageData(0,0,1,1).data].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('');}`;
const painted=`(()=>{const root=document.documentElement,s=getComputedStyle(root),hex=${normalize};return {id:root.dataset.themeId,dark:root.classList.contains('dark'),canvas:hex(s.getPropertyValue('--app-theme-canvas')),accent:hex(s.getPropertyValue('--app-theme-accent')),colors:[...root.style].filter(k=>k.startsWith('--app-theme-')).length,chat:document.body.innerText.includes('Colors resolved'),composer:!!document.querySelector('[data-testid="composer-editor"]'),url:location.pathname}})()`;
const report={checkedAt:new Date().toISOString(),sources:JSON.parse(await readFile(sourcesFile,'utf8')),matrix:[],checks:{}};
async function shot(name){await pause();await pause();const result=await c.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.resolve(output,name+'.png');await writeFile(file,Buffer.from(result.data,'base64'));const capture=await parent(`(async()=>{const g=document.querySelector('webview'),r=g.getBoundingClientRect(),wc=require('electron').remote.webContents.fromId(g.getWebContentsId());if(!wc.debugger.isAttached())wc.debugger.attach('1.3');wc.disableDeviceEmulation();wc.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:Math.round(r.width),height:Math.round(r.height)},deviceScaleFactor:1,viewPosition:{x:0,y:0},viewSize:{width:Math.round(r.width),height:Math.round(r.height)},scale:1});await new Promise(resolve=>setTimeout(resolve,400));const viewport=await g.executeJavaScript('innerWidth');if(viewport!==Math.round(r.width))throw Error('Guest screenshot viewport mismatch: '+viewport+' vs '+r.width);const image=await wc.capturePage();return {image:image.toPNG().toString('base64'),x:r.x,y:r.y,width:r.width,height:r.height}})()`);await writeFile(file+'.guest.png',Buffer.from(capture.image,'base64'));const {execFileSync}=await import('node:child_process');execFileSync('python3',['-c','from PIL import Image;import sys; p=Image.open(sys.argv[1]);g=Image.open(sys.argv[1]+".guest.png");g=g.resize((int(float(sys.argv[4])),int(float(sys.argv[5]))));p.paste(g,(int(float(sys.argv[2])),int(float(sys.argv[3]))));p.save(sys.argv[1])',file,String(capture.x),String(capture.y),String(capture.width),String(capture.height)]);await unlink(file+'.guest.png');return file;}
try{
 await mkdir(output,{recursive:true});
 await c.call('Emulation.setDeviceMetricsOverride',{width:2100,height:1200,deviceScaleFactor:1,mobile:false,screenWidth:2100,screenHeight:1200});
 await wait(async()=>await guest(`!!document.querySelector('[data-testid="composer-editor"]')`));
 await guest(`(()=>{for(const label of ['Toggle right panel','Toggle terminal drawer']){const b=document.querySelector('button[aria-label="'+label+'"]');if(b?.getAttribute('aria-pressed')==='true')b.click();}return true})()`);
 await parent(`app.plugins.plugins.threecode.setFollowTheme(true).then(()=>true)`);
 for(const name of themeNames)for(const appearance of ['light','dark']){
   await parent(`(async()=>{app.customCss.setTheme(${JSON.stringify(name==='Default'?'':name)});await app.customCss.loadTheme();app.changeTheme(${JSON.stringify(appearance==='dark'?'obsidian':'moonstone')});return true})()`);
   let expected;
   await wait(async()=>{expected=await parent(`(()=>{const hex=${normalize},resolved=name=>{const p=document.createElement('span');p.style.color='var('+name+')';document.body.append(p);const color=getComputedStyle(p).color;p.remove();return hex(color);};return {dark:document.body.classList.contains('theme-dark'),canvas:resolved('--background-primary'),accent:resolved('--interactive-accent')}})()`);const actual=await guest(painted);return expected.dark===(appearance==='dark') && actual.dark===expected.dark && actual.canvas===expected.canvas && actual.accent===expected.accent;});
   const actual=await guest(painted);assert.equal(actual.colors,61);assert(actual.chat && actual.composer);assert.match(actual.id,/^obsidian-/);
   await guest(`(()=>{const editor=document.querySelector('[data-testid="composer-editor"]');editor.focus();const range=document.createRange();range.selectNodeContents(editor);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return true})()`);
   const screenshot=await shot(themeSlug(name)+'-'+appearance);
   await guest(`document.querySelector('button[aria-label="Thread actions for Theme synchronization review"]').click()`);
   await wait(async()=>await guest(`document.querySelectorAll('[role="menuitem"]').length>0`));
   const menu=await guest(`[...document.querySelectorAll('[role="menuitem"]')].map(e=>e.textContent)`);
   await guest(`(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.querySelector('[data-testid="composer-editor"]').focus();return true})()`);
   report.matrix.push({theme:name,appearance,...actual,expected,screenshot,menuItems:menu.length});
 }
 // Accent customizations must change the palette without a theme-name lookup.
 const before=await guest(painted);
 await parent(`(()=>{document.body.style.setProperty('--interactive-accent','#ca4567');app.workspace.trigger('css-change');return true})()`);
 await wait(async()=>await guest(painted).then(v=>v.accent==='#ca4567'));
 report.checks.accentCustomization=true;report.checks.accentScreenshot=await shot(themeSlug(themeNames.at(-1))+'-dark-custom-accent');
 await parent(`(()=>{document.body.style.removeProperty('--interactive-accent');app.workspace.trigger('css-change');return true})()`);
 await wait(async()=>await guest(painted).then(v=>v.accent===before.accent));
 // Disable keeps the complete selected palette, including across unrelated CSS changes.
 const previous=await guest(painted);
 await parent(`app.plugins.plugins.threecode.setFollowTheme(false).then(()=>true)`);
 await parent(`(()=>{app.changeTheme('moonstone');app.workspace.trigger('css-change');return true})()`);
 for(let i=0;i<5;i++)await pause();
 assert.deepEqual(await guest(painted),previous);report.checks.disableRetainsPalette=true;
 await guest(`(()=>{for(const label of ['Toggle right panel','Toggle terminal drawer']){const b=document.querySelector('button[aria-label="'+label+'"]');if(b?.getAttribute('aria-pressed')==='true')b.click();}return true})()`);
 await parent(`app.plugins.plugins.threecode.setFollowTheme(true).then(()=>true)`);
 await wait(async()=>!(await guest(painted)).dark);report.checks.reenableAppliesCurrentAppearance=true;
 const route=previous.url;
 await parent(`app.plugins.plugins.threecode.reconnect().then(()=>true)`);
 await wait(async()=>{try{const v=await guest(painted);return v.chat&&v.composer&&!v.dark&&v.colors===61;}catch{return false;}});
 assert.equal((await guest(painted)).url,route);report.checks.reconnect=true;
 await writeFile(path.join(output,'runtime.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({screenshots:report.matrix.length,checks:report.checks,output:path.resolve(output)}));
}finally{c.close();}
