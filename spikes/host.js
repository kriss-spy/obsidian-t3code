// Run through obsidian-eval.mjs. Temporary UI only; no vault files are changed.
if (window.__t3Spike) throw new Error('Clean up the existing spike first.');
const leaf = app.workspace.getRightLeaf(true);
if (!leaf) throw new Error('No right sidebar leaf.');
await leaf.setViewState({ type: 'empty', active: true });
// Prevent Obsidian from reusing this temporary empty leaf for a file-open test.
leaf.view.getViewType = () => 't3-integration-spike';
const root = leaf.view.containerEl.createDiv();
root.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:var(--background-primary)';
root.createEl('div', { text: 'Temporary T3 integration test' });
const guest = document.createElement('webview');
guest.setAttribute('partition', 'persist:obsidian-t3code-spike');
guest.setAttribute('webpreferences', 'contextIsolation=yes,sandbox=yes,nodeIntegration=no');
guest.style.cssText = 'display:flex;flex:1;width:100%;min-height:400px';
const state = window.__t3Spike = { leaf, root, guest, events: [] };
for (const name of ['dom-ready', 'did-finish-load', 'did-fail-load', 'render-process-gone']) {
  guest.addEventListener(name, event => state.events.push({ type: name, code: event.errorCode, description: event.errorDescription }));
}
guest.setAttribute('src', 'http://127.0.0.1:3773/');
root.appendChild(guest);
return JSON.stringify({ created: true, partition: guest.getAttribute('partition') });
