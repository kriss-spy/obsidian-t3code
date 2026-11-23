// Only a disposable, paired review vault. Exercises both actual settings interfaces.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,output]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !output)throw Error('Supply endpoint, disposable review vault and output directory.');
const c=await connectDevelopmentVault(endpoint,vault);
const parent=code=>c.evaluate(code),guest=code=>parent(`document.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const pause=()=>new Promise(r=>setTimeout(r,100));
async function wait(check){for(let i=0;i<150;i++){try{if(await check())return;}catch{}await pause();}throw Error('Theme coordination condition timed out.');}
const flag=()=>parent('app.plugins.plugins.threecode.settings.followTheme');
const persisted=()=>parent(`JSON.parse(require('fs').readFileSync(app.vault.adapter.basePath+'/.obsidian/plugins/threecode/data.json','utf8')).followTheme`);
const painted=`(()=>{const r=document.documentElement,s=getComputedStyle(r),hex=color=>{const c=document.createElement('canvas'),x=c.getContext('2d');c.width=c.height=1;x.fillStyle=color;x.fillRect(0,0,1,1);return '#'+[...x.getImageData(0,0,1,1).data].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('')};return {id:r.dataset.themeId,dark:r.classList.contains('dark'),canvas:hex(s.getPropertyValue('--app-theme-canvas')),colors:[...r.style].filter(p=>p.startsWith('--app-theme-')).map(p=>[p,r.style.getPropertyValue(p)])}})()`;
const toggle=`(()=>{const row=[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(e=>e.querySelector('.setting-item-name')?.textContent==='Follow Obsidian theme');const input=row?.querySelector('[role="switch"],.checkbox-container');return input?.getAttribute('aria-checked')==='true'||input?.classList.contains('is-enabled')||false})()`;
async function theme(name,appearance){await parent(`(async()=>{app.customCss.setTheme(${JSON.stringify(name)});await app.customCss.loadTheme();app.changeTheme(${JSON.stringify(appearance==='dark'?'obsidian':'moonstone')});return true})()`);}
async function choose(name){await guest(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith(${JSON.stringify('Use '+name+' theme')}));if(!b)throw Error('Theme button missing');b.click();return true})()`);}
async function following(canvas){await wait(async()=>{const s=await guest(painted);return await flag()&&await persisted()&&await parent(toggle)&&s.id.startsWith('obsidian-')&&s.canvas===canvas;});}
const report={checkedAt:new Date().toISOString(),checks:{}};
let original;
try{
 await mkdir(output,{recursive:true});
 original=await parent(`({theme:app.customCss.theme,appearance:document.body.classList.contains('theme-dark')?'obsidian':'moonstone',follow:app.plugins.plugins.threecode.settings.followTheme,font:app.plugins.plugins.threecode.settings.followAppearance})`);
 await parent('app.plugins.plugins.threecode.setFollowTheme(true).then(()=>true)');
 await wait(async()=>await guest(`!!document.querySelector('[data-testid="composer-editor"]')`));
 await guest(`(()=>{document.querySelector('button[aria-label="Close"]')?.click();return true})()`);await pause();await pause();await pause();
 await guest(`(()=>{document.querySelector('button[aria-label="Settings"]').click();return true})()`);await pause();await pause();await pause();
 await guest(`(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Appearance').click();return true})()`);
 await wait(async()=>await guest(`!!document.querySelector('button[aria-label^="Use Ocean theme"]')`));
 await parent(`(()=>{app.setting.open();app.setting.openTabById('threecode');return true})()`);await wait(async()=>await parent(toggle));
 await choose('Ocean');await wait(async()=>!(await flag())&&!(await persisted())&&!(await parent(toggle)));report.checks.otherThemeDisablesToggle=true;
 const ocean=await guest(painted);await theme('Tokyo Night','dark');await pause();await pause();await pause();assert.deepEqual(await guest(painted),ocean);report.checks.otherThemeRetainsOwnPalette=true;
 await choose('Obsidian');await following('#1a1b26');report.checks.obsidianSelectionResumesAndChecksToggle=true;
 await theme('Obsidian gruvbox','light');await following('#f9f5d7');report.checks.laterObsidianThemeChangesFollow=true;
 await guest(`(()=>{document.querySelector('button[aria-label="Use dark mode"]').click();return true})()`);await wait(async()=>!(await flag())&&!(await parent(toggle)));report.checks.appearanceOverrideDisables=true;
 await choose('Obsidian');await following('#f9f5d7');report.checks.reselectingActivePaletteResumes=true;
 await parent(`(()=>{const row=[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(e=>e.querySelector('.setting-item-name')?.textContent==='Follow Obsidian theme');row.querySelector('.checkbox-container').click();return true})()`);
 await wait(async()=>!(await flag())&&!(await persisted())&&!(await parent(toggle)));await pause();await pause();const frozen=await guest(painted);
 await theme('Tokyo Night','dark');await pause();await pause();await pause();assert.deepEqual(await guest(painted),frozen);report.checks.pluginToggleOffRetainsPalette=true;
 await choose('Obsidian');await following('#1a1b26');report.checks.selectingFrozenPaletteResumes=true;
 await guest(`(()=>{const buttons=[...document.querySelectorAll('button')],ocean=buttons.find(b=>b.getAttribute('aria-label')?.startsWith('Use Ocean theme')),obsidian=buttons.find(b=>b.getAttribute('aria-label')?.startsWith('Use Obsidian theme'));ocean.click();obsidian.click();return true})()`);await following('#1a1b26');report.checks.rapidReselectionKeepsLatestIntent=true;
 assert.equal(await parent('app.plugins.plugins.threecode.settings.followAppearance'),original.font);report.checks.fontFollowingIndependent=true;
 await parent(`(()=>{app.setting.close();return true})()`);await guest(`(()=>{document.querySelector('button[aria-label="Close"]')?.click();return true})()`);await pause();await pause();await pause();
 await parent('app.plugins.plugins.threecode.reconnect().then(()=>true)');await wait(async()=>{const s=await guest(painted);return await flag()&&await persisted()&&s.id.startsWith('obsidian-')&&s.canvas==='#1a1b26';});
 await theme('Everforest Enchanted','dark');await wait(async()=>(await guest(painted)).canvas==='#333c43');report.checks.reconnectContinuesFollowing=true;
 await writeFile(path.join(output,'runtime.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{
 if(original)await parent(`(async()=>{app.setting.close();app.customCss.setTheme(${JSON.stringify(original.theme)});await app.customCss.loadTheme();app.changeTheme(${JSON.stringify(original.appearance)});await app.plugins.plugins.threecode.setFollowTheme(${original.follow});return true})()`).catch(()=>{});
 c.close();
}
