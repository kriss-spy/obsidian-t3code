// Run only against a disposable Obsidian vault and an isolated, paired T3 server.
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';
const [endpoint,vault] = process.argv.slice(2);
if (!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-')) throw Error('Supply a disposable fixture vault.');
const c = await connectDevelopmentVault(endpoint,vault);
const parent = code => c.evaluate(code);
const guest = code => parent(`window.issue28.origin.contentEl.querySelector('webview')?.executeJavaScript(${JSON.stringify(code)})`);
const pause = () => new Promise(resolve=>setTimeout(resolve,100));
async function wait(check,message) { for(let i=0;i<100;i++) {if(await check())return;await pause();}throw Error(message); }
const checks={};
let previousFormatting;
try {
  previousFormatting=await parent(`app.plugins.plugins.threecode.settings.formatDraftLinks`);
  await parent(`app.plugins.plugins.threecode.setDraftFormatting(true).then(()=>true)`);
  await parent(`window.issue28={origin:app.workspace.getLeavesOfType('t3-code-workspace')[0].view};true`);
  await parent(`(async()=>{await app.workspace.revealLeaf(window.issue28.origin.leaf);return true})()`);
  await wait(()=>guest(`!!window.t3ObsidianHostV1?.composerTarget()`),'Composer unavailable');
  const snapshot = await guest(`({target:window.t3ObsidianHostV1.composerTarget(),messages:document.querySelectorAll('[data-message-id]').length})`);
  await guest(`(()=>{const input=document.querySelector('input[type="file"]');const data=new DataTransfer();data.items.add(new File(['draft editor attachment'],'issue28-keep.txt',{type:'text/plain'}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  await wait(()=>guest(`document.body.innerText.includes('issue28-keep.txt')`),'Attachment not staged');
  // Confirm that an attached file and a serialized file reference survive text replacement.
  await parent(`window.issue28.origin.appendContext(' ISSUE28 before [Reference](${vault}/Runtime%20fixture.md) ')`);
  await parent(`(async()=>{
    const file=app.vault.getFileByPath('Issue28 target.md');
    if(file)await app.vault.modify(file,'# Start\\nbody\\n## Nested\\nnested\\n# Final\\nlast');
    else await app.vault.create('Issue28 target.md','# Start\\nbody\\n## Nested\\nnested\\n# Final\\nlast');
    return true;
  })()`);
  await wait(()=>parent(`!!app.metadataCache.getCache('Issue28 target.md')?.headings`),'Heading metadata unavailable');
  const before = await parent(`(async()=>{const b=window.issue28.origin.bridge,s=await b.beginDraft();await b.cancelDraft(s.id);return s.text})()`);
  await parent(`(async()=>{await window.issue28.origin.editDraft();await new Promise(resolve=>window.setTimeout(resolve,250));window.issue28.note=app.workspace.activeLeaf.view;window.issue28.file=window.issue28.note.file;return true})()`);
  const opened = await parent(`({text:window.issue28.note.editor.getValue(),sameParent:window.issue28.note.leaf.parent===window.issue28.origin.leaf.parent,actions:!!window.issue28.note.containerEl.querySelector('[data-t3-draft-action="return"]'),source:window.issue28.note.getMode()})`);
  assert(opened.text.includes('ISSUE28 before'));assert(opened.sameParent);assert(opened.actions);assert.equal(opened.source,'source');
  await parent(`window.issue28.note.editor.setValue(window.issue28.note.editor.getValue()+${JSON.stringify('\nRead [[Issue28 target#Start|Section]].\n`[[Missing in code]]`')});true`);
  // Automatic saves must not finish the request.
  await parent(`window.issue28.note.save().then(()=>true)`);
  assert.equal(await parent(`(async()=>{const b=window.issue28.origin.bridge,s=await b.beginDraft();await b.cancelDraft(s.id);return s.text})()`),before);
  await parent(`window.issue28.note.containerEl.querySelector('[data-t3-draft-action="return"]').click();true`);
  await wait(()=>parent(`!app.vault.getFileByPath(window.issue28.file.path)`),'Returned draft was not cleaned up');
  const after = await guest(`({text:document.querySelector('[data-testid="composer-editor"]').innerText,attachment:document.body.innerText.includes('issue28-keep.txt'),target:window.t3ObsidianHostV1.composerTarget(),messages:document.querySelectorAll('[data-message-id]').length})`);
  assert(after.text.includes('ISSUE28 before'));assert(after.text.includes('Issue28 target.md'));assert(after.text.includes('Missing in code'));assert(after.attachment);
  assert.equal(after.target,snapshot.target);assert.equal(after.messages,snapshot.messages);
  const persisted = await guest(`Object.entries(localStorage).filter(([key])=>key.includes('composer')).map(([key,value])=>({key,value})).filter(x=>x.value.includes('ISSUE28 before'))`);
  assert(persisted.some(x=>x.value.includes('Issue28%20target.md:1-4')),'Heading range must include nested section');
  assert(persisted.some(x=>x.value.includes('issue28-keep.txt')),'Attachment must remain in persisted draft');
  assert.equal(await parent(`app.workspace.activeLeaf===window.issue28.origin.leaf`),true);
  checks.centerReturnAndCleanup=true;checks.explicitCompletion=true;checks.attachmentAndReferencePreservation=true;checks.headingRange=true;checks.noSubmission=true;

  await parent(`(async()=>{await window.issue28.origin.editDraft();await new Promise(resolve=>window.setTimeout(resolve,250));window.issue28.note=app.workspace.activeLeaf.view;window.issue28.file=window.issue28.note.file;window.issue28.note.editor.setValue('[[Missing note for issue28]]');return true})()`);
  const failed = await parent(`app.plugins.plugins.threecode.draftNotes.finish(window.issue28.note).then(()=>null,error=>error.message)`);
  assert.match(failed,/missing or ambiguous/);
  assert.equal(await parent(`!!app.vault.getFileByPath(window.issue28.file.path)`),true);
  assert.equal(await guest(`document.querySelector('[data-testid="composer-editor"]').innerText`),after.text);
  await parent(`app.plugins.plugins.threecode.draftNotes.finish(window.issue28.note,true).then(()=>true)`);
  assert.equal(await parent(`!!app.vault.getFileByPath(window.issue28.file.path)`),false);
  assert.equal(await guest(`document.querySelector('[data-testid="composer-editor"]').innerText`),after.text);
  checks.unresolvedLinkRecovery=true;checks.cancelPreservesComposer=true;

  await parent(`(async()=>{await window.issue28.origin.editDraft();await new Promise(resolve=>window.setTimeout(resolve,250));window.issue28.note=app.workspace.activeLeaf.view;window.issue28.file=window.issue28.note.file;window.issue28.note.editor.setValue('Do not overwrite newer input');await window.issue28.origin.appendContext(' ISSUE28 newer input');return true})()`);
  const conflict = await parent(`app.plugins.plugins.threecode.draftNotes.finish(window.issue28.note).then(()=>null,error=>error.message)`);
  assert.match(conflict,/composer changed/);
  assert((await guest(`document.querySelector('[data-testid="composer-editor"]').innerText`)).includes('ISSUE28 newer input'));
  assert.equal(await parent(`!!app.vault.getFileByPath(window.issue28.file.path)`),true);
  await parent(`app.plugins.plugins.threecode.draftNotes.finish(window.issue28.note,true).then(()=>true)`);
  checks.newerInputConflict=true;

  await parent(`(async()=>{const leaf=app.workspace.getRightLeaf(true);window.issue28.sidebar=leaf;await leaf.setViewState({type:'t3-code-workspace',active:true,state:window.issue28.origin.getState()});window.issue28.origin=leaf.view;await app.workspace.revealLeaf(leaf);return true})()`);
  await wait(()=>guest(`!!window.t3ObsidianHostV1?.composerTarget()`),'Sidebar composer unavailable');
  await parent(`(async()=>{await window.issue28.origin.editDraft();await new Promise(resolve=>window.setTimeout(resolve,250));window.issue28.note=app.workspace.activeLeaf.view;window.issue28.file=window.issue28.note.file;return true})()`);
  assert.equal(await parent(`window.issue28.note.leaf.parent===window.issue28.sidebar.parent`),true);
  await parent(`window.issue28.note.editor.setValue(window.issue28.note.editor.getValue()+' ISSUE28 sidebar return');true`);
  await parent(`app.plugins.plugins.threecode.draftNotes.finish(window.issue28.note).then(()=>true)`);
  assert((await guest(`document.querySelector('[data-testid="composer-editor"]').innerText`)).includes('ISSUE28 sidebar return'));
  assert.equal(await parent(`app.workspace.activeLeaf===window.issue28.sidebar`),true);
  checks.sidebarReturn=true;
  console.log(JSON.stringify({platform:process.platform,checks},null,2));
} finally {
  await parent(`(async()=>{
    if(window.issue28?.sidebar)window.issue28.sidebar.detach();
    const plugin=app.plugins.plugins.threecode;
    for(const leaf of app.workspace.getLeavesOfType('markdown'))if(plugin.draftNotes.has(leaf.view.file))await plugin.draftNotes.finish(leaf.view,true);
    delete window.issue28;return true;
  })()`).catch(()=>{});
  if(typeof previousFormatting==='boolean')await parent(`app.plugins.plugins.threecode.setDraftFormatting(${previousFormatting}).then(()=>true)`).catch(()=>{});
  c.close();
}
