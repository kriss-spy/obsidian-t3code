// Run only against an isolated Obsidian development instance with CDP enabled.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const [endpoint, expectedVault] = process.argv.slice(2);
if (!endpoint || !expectedVault) throw new Error('Usage: node scripts/check-development-vault.mjs <http://127.0.0.1:port> <absolute disposable vault>');
const tabs = await (await fetch(endpoint + '/json/list')).json();
const target = tabs.find(t => t.type === 'page' && t.url === 'app://obsidian.md/index.html');
if (!target) throw new Error('No Obsidian page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = e => { const message = JSON.parse(e.data); const entry = pending.get(message.id); if (entry) { pending.delete(message.id); entry(message); } };
async function evaluate(expression) {
  const id = ++nextId;
  const response = new Promise(resolve => pending.set(id, resolve));
  socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  const message = await response;
  if (message.error || message.result.exceptionDetails) throw new Error(JSON.stringify(message.error ?? message.result.exceptionDetails));
  return message.result.result.value;
}
try {
  assert.equal(await evaluate('app.vault.adapter.getBasePath()'), expectedVault, 'Refuse to test a personal vault');
  const guestModule = await transform(await readFile(new URL('../src/guest.ts', import.meta.url), 'utf8'), {loader:'ts', format:'cjs'});
  const isolation = await evaluate(`(async () => {
    const module = {exports:{}};
    new Function('module', ${JSON.stringify(guestModule.code)})(module);
    const guest = module.exports.createGuest(document, 't3-code-disposable-isolation', 'about:blank');
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Guest timed out')), 10000);
      guest.addEventListener('dom-ready', () => {clearTimeout(timer);resolve();}, {once:true});
    });
    document.body.appendChild(guest);
    try {
      await ready;
      const prefs = require('electron').remote.webContents.fromId(guest.getWebContentsId()).getLastWebPreferences();
      const globals = await guest.executeJavaScript('({require:typeof require,process:typeof process})');
      if (!prefs.contextIsolation || !prefs.sandbox || prefs.nodeIntegration || !prefs.webSecurity) throw new Error('Guest isolation failed');
      if (globals.require !== 'undefined' || globals.process !== 'undefined') throw new Error('Guest has Node globals');
      return {contextIsolation:prefs.contextIsolation,sandbox:prefs.sandbox,nodeIntegration:prefs.nodeIntegration,webSecurity:prefs.webSecurity};
    } finally {guest.remove();}
  })()`);
  const result = await evaluate(`(async () => {
    await app.plugins.disablePlugin('t3-code');
    await app.plugins.enablePlugin('t3-code');
    const plugin = app.plugins.plugins['t3-code'];
    if (!plugin) throw new Error('Plugin not loaded');
    await Promise.all([plugin.openWorkspace(), plugin.openWorkspace()]);
    const leaves = app.workspace.getLeavesOfType('t3-code-workspace');
    if (leaves.length !== 1) throw new Error('Open duplicated the workspace');
    const view = leaves[0].view;
    if (view.contentEl.querySelector('webview')) throw new Error('Unsupported guest mounted');
    if (!plugin.diagnostic.includes('0.1.11, protocol 2')) throw new Error('Descriptor not checked: ' + plugin.diagnostic);
    await view.setState({target:'/pair?token=fixture-secret'}, {});
    if (JSON.stringify(view.getState()).includes('fixture-secret')) throw new Error('Pairing URL persisted');
    await plugin.saveSettings();
    const persisted = await plugin.loadData();
    if (Object.keys(persisted).sort().join(',') !== 'followAppearance,origin,target') throw new Error('Unexpected settings');
    const hash = require('crypto').createHash('sha256').update(plugin.vaultRoot + '\\0' + plugin.settings.origin).digest('hex');
    const sessions = require('electron').remote.session;
    const ownSession = sessions.fromPartition('persist:obsidian-t3-code-' + hash);
    const otherSession = sessions.fromPartition('t3-code-disposable-reset-control');
    for (const session of [ownSession, otherSession]) await session.cookies.set({url:plugin.settings.origin, name:'reset-fixture', value:'disposable'});
    await plugin.resetConnection();
    if ((await ownSession.cookies.get({name:'reset-fixture'})).length) throw new Error('Reset retained own cookie');
    if ((await otherSession.cookies.get({name:'reset-fixture'})).length !== 1) throw new Error('Reset cleared another partition');
    await otherSession.clearStorageData();
    const reset = plugin.diagnostic;
    await app.plugins.disablePlugin('t3-code');
    if (document.querySelector('.t3-code-guest')) throw new Error('Guest leaked after disable');
    await app.plugins.enablePlugin('t3-code');
    await app.plugins.plugins['t3-code'].openWorkspace();
    if (!app.plugins.plugins['t3-code'].diagnostic.includes('0.1.11, protocol 2')) throw new Error('Reload retained an old plugin instance');
    return {singleWorkspace:true, unsupportedGuestUnmounted:true, descriptorChecked:true,
      credentialsNotPersisted:true, partitionResetIsolated:true, reset, reload:true, diagnostic:app.plugins.plugins['t3-code'].diagnostic};
  })()`);
  console.log(JSON.stringify({isolation,...result}, null, 2));
} finally { socket.close(); }
