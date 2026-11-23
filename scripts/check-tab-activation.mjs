// Use only a disposable Obsidian vault with a connected T3 thread.
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectDevelopmentVault} from './obsidian-cdp.mjs';

const [endpoint, vault] = process.argv.slice(2);
if (!vault || !path.basename(path.dirname(vault)).startsWith('obsidian-t3-gate-')) {
  throw Error('Supply a loopback CDP endpoint and a disposable fixture vault.');
}
const c = await connectDevelopmentVault(endpoint, vault);
const view = `app.workspace.getLeavesOfType('t3-code-workspace')[0].view`;
const guest = code => c.evaluate(`${view}.contentEl.querySelector('webview').executeJavaScript(${JSON.stringify(code)})`);
let noteId;
try {
  for (let attempt=0; attempt<50; attempt++) {
    if (await guest('!!document.querySelector(\'[data-testid="composer-editor"]\')')) break;
    if (attempt===49) throw Error('Open a paired T3 thread before checking tab activation.');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  await guest(`(() => {
    const composer = document.querySelector('[data-testid="composer-editor"]');
    if (!composer) throw Error('Open a paired T3 thread before checking tab activation.');
    window.t3TabActivationCheck = {composer, scopeChecks:0};
    const state = window.t3TabActivationCheck;
    state.observer = new MutationObserver(() => {
      if (document.body.textContent.includes('Checking vault session scope')) state.scopeChecks++;
    });
    state.observer.observe(document.body, {childList:true, subtree:true});
  })()`);
  noteId = await c.evaluate(`(async () => {
    const file = app.vault.getMarkdownFiles()[0];
    if (!file) throw Error('The disposable vault needs a Markdown note.');
    const note = app.workspace.getLeaf('tab');
    await note.openFile(file);
    return note.id;
  })()`);
  for (let attempt=0; attempt<5; attempt++) {
    const box = await c.evaluate(`(() => {
      app.workspace.setActiveLeaf(app.workspace.getLeafById(${JSON.stringify(noteId)}), {focus:true});
      const r = app.workspace.getLeavesOfType('t3-code-workspace')[0].tabHeaderEl.getBoundingClientRect();
      return {x:r.x+r.width/2, y:r.y+r.height/2};
    })()`);
    await new Promise(resolve => setTimeout(resolve, 2200));
    for (const type of ['mousePressed','mouseReleased']) {
      await c.call('Input.dispatchMouseEvent', {type, ...box, button:'left', clickCount:1});
    }
    await new Promise(resolve => setTimeout(resolve, 350));
    const result = await guest(`(() => {
      const state = window.t3TabActivationCheck;
      return {sameDocument:!!state, sameComposer:state?.composer === document.querySelector('[data-testid="composer-editor"]'), scopeChecks:state?.scopeChecks};
    })()`);
    assert.equal(result.sameDocument, true, 'Tab activation must preserve the guest document.');
    assert.equal(result.sameComposer, true, 'Tab activation must preserve the mounted composer.');
    assert.equal(result.scopeChecks, 0, 'Tab activation must not restart vault scope checking.');
  }
  console.log(JSON.stringify({switches:5, sameDocument:true, sameComposer:true, scopeChecks:0}));
} finally {
  try {
    await guest('window.t3TabActivationCheck?.observer.disconnect(); delete window.t3TabActivationCheck;');
    if (noteId) await c.evaluate(`app.workspace.getLeafById(${JSON.stringify(noteId)})?.detach()`);
  } finally { c.close(); }
}
