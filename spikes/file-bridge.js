// Tests transport and routing; wiring T3's real callback is separate.
const guest = window.__t3Spike.guest;
const fs = require('fs');
const path = require('path');
const directory = fs.mkdtempSync(path.join(require('os').tmpdir(), 't3-host-bridge-'));
const markdown = path.join(directory, 'bridge fixture.md');
fs.writeFileSync(markdown, '# File bridge fixture\n');
let leaf;
try {
  await guest.executeJavaScript(`(() => {
    window.__obsidianT3Requests = [];
    window.__obsidianT3Listener = event => window.__obsidianT3Requests.push(event.detail);
    window.addEventListener('obsidian-t3:open-markdown', window.__obsidianT3Listener);
  })()`);
  await guest.executeJavaScript(`window.dispatchEvent(new CustomEvent('obsidian-t3:open-markdown', {detail:${JSON.stringify({environmentId:'local-fixture',path:markdown,line:1})}}))`);
  if (new URL(guest.getURL()).origin !== 'http://127.0.0.1:3773') throw new Error('Unexpected origin');
  const requests = await guest.executeJavaScript('window.__obsidianT3Requests.splice(0,16)');
  if (requests.length !== 1) throw new Error('Expected one request');
  const request = requests[0];
  if (request.environmentId !== 'local-fixture' || request.path !== markdown) throw new Error('Unexpected request');
  const file = app.vault.getFileByPath('file:' + request.path);
  if (!file) throw new Error('No external file');
  leaf = app.workspace.getLeaf('tab');
  await leaf.openFile(file, {active:true,state:{mode:'source'}});
  return JSON.stringify({requestReceived:true,openedInMarkdownEditor:leaf.view.getViewType()==='markdown',nodeInGuest:await guest.executeJavaScript('typeof require'),transport:'bounded request queue via executeJavaScript',realT3FileClickTested:false});
} finally {
  await guest.executeJavaScript(`window.removeEventListener('obsidian-t3:open-markdown', window.__obsidianT3Listener); delete window.__obsidianT3Listener; delete window.__obsidianT3Requests;`);
  leaf?.detach();
  fs.rmSync(directory, {recursive:true,force:true});
}
