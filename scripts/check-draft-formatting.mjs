// Check the real settings toggle and compare formatted links with the pinned T3 tokenizer.
import assert from 'node:assert/strict';
import path from 'node:path';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault,checkout]=process.argv.slice(2);
if(!vault||!checkout||!path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-'))throw Error('Supply a disposable fixture vault and the pinned T3 checkout.');
const code=buildSync({entryPoints:[path.join(checkout,'packages/shared/src/composerInlineTokens.ts')],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
const module={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),module,module.exports);
const c=await connectDevelopmentVault(endpoint,vault);
const input=`Paragraph stays unchanged.
[agentsmd](study/AI/agentsmd.md)
[Theo](${vault}/resources/contacts/Theo.md)
[Matt Pocock](${vault}/resources/contacts/Matt%20Pocock.md)
[daily notes.md](logs%20and%20review/daily%20notes.md)
[[Draft template regression|Display alias]]
\`[[Literal]]\`
[Website](https://example.com)
`;
async function returnDraft(text) {
 await c.evaluate(`(async()=>{const p=app.plugins.plugins.threecode,leaf=app.workspace.getLeavesOfType('t3-code-workspace')[0]??app.workspace.getLeaf('tab');window.draftFormatCheck={};
 await p.draftNotes.open({leaf,current:()=>true,focus:async()=>{},bridge:{beginDraft:async()=>({id:crypto.randomUUID(),text:${JSON.stringify(text)},cwd:app.vault.adapter.getBasePath()+'/Project working folder'}),returnDraft:async(id,text)=>{window.draftFormatCheck.returned=text;},cancelDraft:async()=>{}}});
 await new Promise(r=>setTimeout(r,250));const view=app.workspace.activeLeaf.view;window.draftFormatCheck.view=view;window.draftFormatCheck.file=view.file;view.containerEl.querySelector('[data-t3-draft-action="return"]').click();return true;})()`);
 for(let i=0;i<100;i++) {
  const result=await c.evaluate(`window.draftFormatCheck.returned`);
  if(typeof result==='string'&&await c.evaluate('!app.vault.getFileByPath(window.draftFormatCheck.file.path)'))return result;
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error('Draft return did not complete.');
}
try {
 await c.evaluate(`app.plugins.plugins.threecode.setDraftFormatting(false).then(()=>true)`);
 assert.equal(await returnDraft(input),input,'Disabled formatting must preserve the exact draft');
 await c.evaluate(`(async()=>{app.setting.open();app.setting.openTabById('threecode');await new Promise(r=>setTimeout(r,100));const item=[...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')].find(e=>e.querySelector('.setting-item-name')?.textContent==='Format draft links on return');if(!item)throw Error('Formatting setting is missing');item.querySelector('.checkbox-container').click();return true})()`);
 for(let i=0;i<50;i++){if(await c.evaluate('app.plugins.plugins.threecode.loadData().then(data=>data.formatDraftLinks===true)'))break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(await c.evaluate('app.plugins.plugins.threecode.loadData().then(data=>data.formatDraftLinks)'),true);
 await c.evaluate(`(async()=>{app.setting.close();await app.plugins.disablePlugin('threecode');await app.plugins.enablePlugin('threecode');return true})()`);
 assert.equal(await c.evaluate('app.plugins.plugins.threecode.settings.formatDraftLinks'),true,'Formatting setting must survive plugin reload');
 const formatted=await returnDraft(input);
 assert(formatted.includes('[agentsmd.md](study/AI/agentsmd.md)'));
 assert(formatted.includes(`[Theo.md](${vault}/resources/contacts/Theo.md)`));
 assert(formatted.includes(`[Matt Pocock.md](${vault}/resources/contacts/Matt%20Pocock.md)`));
 assert(formatted.includes('[Draft template regression.md](../Draft%20template%20regression.md)'));
 assert(formatted.includes('`[[Literal]]`'));assert(formatted.includes('[Website](https://example.com)'));
 const mentions=module.exports.collectComposerInlineTokens(formatted).filter(token=>token.type==='mention');
 assert.equal(mentions.length,5,'Every formatted file link must be recognized by the real T3 tokenizer');
 assert.equal(await returnDraft(formatted),formatted,'A second formatting round trip must be stable');
 await c.evaluate(`(async()=>{const file=app.vault.getFileByPath('FormatHeading.md');const text=${JSON.stringify('# Start\nbody\n# End\nlast')};if(file)await app.vault.modify(file,text);else await app.vault.create('FormatHeading.md',text);return true})()`);
 for(let i=0;i<50;i++){if(await c.evaluate(`!!app.metadataCache.getCache('FormatHeading.md')?.headings`))break;await new Promise(r=>setTimeout(r,50));}
 const heading=await returnDraft('[[FormatHeading#Start]]');
 const headingToken=module.exports.collectComposerInlineTokens(heading).find(token=>token.type==='mention');
 assert(headingToken,'Generated heading reference must be recognized');
 const fileCode=buildSync({entryPoints:[path.join(checkout,'packages/shared/src/fileLinks.ts')],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
 const fileModule={exports:{}};new Function('require','module','exports',fileCode)(createRequire(import.meta.url),fileModule,fileModule.exports);
 assert.deepEqual(fileModule.exports.splitFilePathPosition(headingToken.value),{path:'../FormatHeading.md',line:1,endLine:2});
 const terminal=await returnDraft(`[Theo](${vault}/resources/contacts/Theo.md)`);
 assert.equal(module.exports.collectComposerInlineTokens(terminal).filter(token=>token.type==='mention').length,1,'A terminal link needs a whitespace boundary to become a mention');
 console.log(JSON.stringify({toggleUI:true,persistedAfterReload:true,disabledPreservesExactText:true,recognizedMentions:mentions.length,existingPathsPreserved:true,formattingIsStable:true,terminalMentionRecognized:true,headingRangeRecognized:true}));
} finally {
 await c.evaluate(`(async()=>{app.setting.close();const p=app.plugins.plugins.threecode,state=window.draftFormatCheck;if(state&&p.draftNotes.has(state.file))await p.draftNotes.finish(state.view,true);await p.setDraftFormatting(false);delete window.draftFormatCheck;return true})()`).catch(()=>{});
 c.close();
}
