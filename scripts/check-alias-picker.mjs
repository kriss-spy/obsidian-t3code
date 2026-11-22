// Uses the real Ctrl+P picker in a disposable vault. Prepare its alias fixture first.
import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,output]=process.argv.slice(2);
if(!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-') || !output)throw Error('Supply endpoint, disposable vault, and output.');
const c=await connectDevelopmentVault(endpoint,vault);
const guest=code=>c.evaluate(`app.workspace.getLeavesOfType('t3-code-workspace')[0].view.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
const expected='extracurricular/ACG/games/gacha game/Blue Archive/Blue Archive.md';
async function wait(code){for(let i=0;i<100;i++){if(await guest(code))return;await new Promise(r=>setTimeout(r,100));}throw Error('Picker condition timed out');}
try{
 await c.evaluate(`app.plugins.plugins['t-three-code-workspace'].openWorkspace().then(()=>true)`);
 await wait(`!!document.querySelector('[data-chat-composer-form]')`);
 await guest(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',code:'KeyP',ctrlKey:true,bubbles:true}))`);
 await wait(`!!document.querySelector('[data-testid="project-file-picker"] input')`);
 await guest(`(()=>{const input=document.querySelector('[data-testid="project-file-picker"] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'蔚蓝档案');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
 await wait(`[...document.querySelectorAll('[role="option"]')].some(e=>e.textContent.includes(${JSON.stringify(expected)}))`);
 const results=await guest(`[...document.querySelectorAll('[role="option"]')].map(e=>e.textContent)`);
 assert(results[0].includes(expected),'Exact alias must precede competing path results');
 const selection=await guest(`(()=>{const first=document.querySelector('[role="option"]');const input=document.querySelector('[data-testid="project-file-picker"] input');return {firstResultActive:first?.hasAttribute('data-active'),firstResultHighlighted:first?.hasAttribute('data-highlighted'),activeDescendantMatchesFirst:input?.getAttribute('aria-activedescendant')===first?.id}})()`);
 assert(selection.firstResultActive,'First result must have the visible active styling');
 assert(selection.firstResultHighlighted && selection.activeDescendantMatchesFirst,'Keyboard highlight must agree with the first result');
 const evidence={...selection,query:'蔚蓝档案',expectedPath:expected,firstResult:results[0],resultCount:results.length,passed:true};
 await writeFile(output,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
 await guest(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
}finally{c.close();}
