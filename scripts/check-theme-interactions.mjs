// Only disposable vaults with the review fixture. Sends a read-only printf command to the terminal.
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
const report={checkedAt:new Date().toISOString(),checks:{}};
const click=label=>guest(`(()=>{document.querySelector('button[aria-label='+${JSON.stringify(JSON.stringify(label))}+']').click();return true})()`);
const isFollowing=()=>parent('app.plugins.plugins.threecode.settings.followTheme');
const enable=()=>parent('app.plugins.plugins.threecode.setFollowTheme(true).then(()=>true)');
const painted=()=>guest(`({id:document.documentElement.dataset.themeId,dark:document.documentElement.classList.contains('dark'),canvas:getComputedStyle(document.documentElement).getPropertyValue('--app-theme-canvas')})`);
async function shot(name){await pause();await pause();const result=await c.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.resolve(output,name+'.png');await writeFile(file,Buffer.from(result.data,'base64'));const capture=await parent(`(async()=>{const g=document.querySelector('webview'),r=g.getBoundingClientRect(),wc=require('electron').remote.webContents.fromId(g.getWebContentsId());if(!wc.debugger.isAttached())wc.debugger.attach('1.3');wc.disableDeviceEmulation();wc.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:Math.round(r.width),height:Math.round(r.height)},deviceScaleFactor:1,viewPosition:{x:0,y:0},viewSize:{width:Math.round(r.width),height:Math.round(r.height)},scale:1});await new Promise(resolve=>setTimeout(resolve,400));const viewport=await g.executeJavaScript('innerWidth');if(viewport!==Math.round(r.width))throw Error('Guest screenshot viewport mismatch: '+viewport+' vs '+r.width);const image=await wc.capturePage();return {image:image.toPNG().toString('base64'),x:r.x,y:r.y,width:r.width,height:r.height}})()`);await writeFile(file+'.guest.png',Buffer.from(capture.image,'base64'));const {execFileSync}=await import('node:child_process');execFileSync('python3',['-c','from PIL import Image;import sys; p=Image.open(sys.argv[1]);g=Image.open(sys.argv[1]+".guest.png");g=g.resize((int(float(sys.argv[4])),int(float(sys.argv[5]))));p.paste(g,(int(float(sys.argv[2])),int(float(sys.argv[3]))));p.save(sys.argv[1])',file,String(capture.x),String(capture.y),String(capture.width),String(capture.height)]);await unlink(file+'.guest.png');return file;}
try{
 await c.call('Emulation.setDeviceMetricsOverride',{width:2100,height:1200,deviceScaleFactor:1,mobile:false});
 await guest(`(()=>{const b=document.querySelector('button[aria-label="Toggle right panel"]');if(b?.getAttribute('aria-pressed')==='true')b.click();return true})()`);
 await enable();await wait(async()=>/^obsidian-/.test((await painted()).id));
 if(await guest(`!!document.querySelector('button[aria-label=Close]')`)){await click('Close');await pause();await pause();await pause();}
 await click('Settings');await pause();await pause();await pause();await wait(async()=>await guest(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Appearance')`));
 await guest(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Appearance').click();return true})()`);
 await wait(async()=>await guest(`!!document.querySelector('button[aria-label="Use dark mode"]')`));
 const wasDark=(await painted()).dark;await click(wasDark?'Use light mode':'Use dark mode');
 await wait(async()=>!(await isFollowing()));const manualAppearance=await painted();assert.equal(await guest(`document.querySelector('button[aria-label="${wasDark?'Use light mode':'Use dark mode'}"]').getAttribute('aria-pressed')`),'true');
 assert.equal(await parent(`JSON.parse(require('fs').readFileSync(app.vault.adapter.basePath+'/.obsidian/plugins/threecode/data.json','utf8')).followTheme`),false);
 await parent(`(()=>{app.changeTheme(${JSON.stringify('obsidian')});return true})()`);await pause();await pause();assert.equal((await painted()).dark,manualAppearance.dark);
 report.checks.manualAppearanceDisablesAndPersists=true;
 await parent(`app.plugins.plugins.threecode.reconnect().then(()=>true)`);await wait(async()=>await guest(`!!document.querySelector('[data-testid="composer-editor"]')`));
 assert.equal(await isFollowing(),false);assert.equal((await painted()).dark,manualAppearance.dark);report.checks.manualOverrideSurvivesReconnect=true;
 await enable();await wait(async()=>/^obsidian-/.test((await painted()).id));
 await click('Settings');await pause();await pause();await pause();await wait(async()=>await guest(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Appearance')`));
 await guest(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Appearance').click();return true})()`);
 await wait(async()=>await guest(`!!document.querySelector('button[aria-label="Use Ocean theme"]')`));await click('Use Ocean theme');
 await wait(async()=>!(await isFollowing()));assert.equal((await painted()).id,'ocean');report.checks.manualThemeDisables=true;
 await click('Close');await pause();await pause();await pause();await enable();await wait(async()=>/^obsidian-/.test((await painted()).id));
 if(!await guest(`!!document.querySelector('textarea[aria-label="Terminal input"]')`))await click('Toggle terminal drawer');
 await wait(async()=>await guest(`!!document.querySelector('textarea[aria-label="Terminal input"]')`));
 const terminalCommand=String.raw`printf '\033[31mError\033[0m  \033[33mWarning\033[0m  \033[32mReady\033[0m  terminal text\n'`;
 await guest(`(()=>{const input=document.querySelector('textarea[aria-label="Terminal input"]');input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'l',code:'KeyL',ctrlKey:true,bubbles:true}));const data=new DataTransfer();data.setData('text/plain',${JSON.stringify(terminalCommand)});input.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:data}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));return true})()`);
 report.terminal=[];
 for(const theme of themeNames)for(const appearance of ['light','dark']){
  await parent(`(async()=>{app.customCss.setTheme(${JSON.stringify(theme==='Default'?'':theme)});await app.customCss.loadTheme();app.changeTheme(${JSON.stringify(appearance==='dark'?'obsidian':'moonstone')});return true})()`);
  await wait(async()=>(await painted()).dark===(appearance==='dark'));await pause();await pause();
  report.terminal.push({theme,appearance,screenshot:await shot(themeSlug(theme)+'-'+appearance+'-terminal')});
 }
 await writeFile(path.join(output,'supplemental-runtime.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{c.close();}
