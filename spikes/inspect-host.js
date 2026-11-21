const state = window.__t3Spike;
if (!state) throw new Error('No host spike.');
const guestState = await state.guest.executeJavaScript(`JSON.stringify({
  title:document.title,
  origin:location.origin,
  require:typeof require,
  process:typeof process,
  ready:document.readyState,
  editors:document.querySelectorAll('[contenteditable=true],textarea').length,
  buttons:document.querySelectorAll('button').length,
  pairingScreen:document.body.innerText.includes('Pair with this environment'),
  hasNewThreadControl:!!document.querySelector('button[aria-label*="New thread"],button[title*="New thread"]')
})`);
const remote = require('@electron/remote');
const contents = remote.webContents.fromId(state.guest.getWebContentsId());
return JSON.stringify({ events: state.events, preferences: contents.getLastWebPreferences(), page: JSON.parse(guestState) });
