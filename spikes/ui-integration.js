const state = window.__t3Spike;
const guest = state.guest;
if (new URL(guest.getURL()).origin !== 'http://127.0.0.1:3773') throw new Error('Unexpected origin.');
const before = await guest.executeJavaScript(`(() => {
  const editor = document.querySelector('[contenteditable=true]');
  if (!editor || editor.textContent.trim()) throw new Error('Expected an empty composer.');
  editor.focus(); return {empty:true};
})()`);
const contents = require('@electron/remote').webContents.fromId(guest.getWebContentsId());
await contents.insertText('Temporary Obsidian context fixture. Do not send.');
const inserted = await guest.executeJavaScript(`document.querySelector('[contenteditable=true]').textContent.includes('Temporary Obsidian context fixture.')`);
const colors = getComputedStyle(document.body);
const background = colors.getPropertyValue('--background-primary').trim();
const foreground = colors.getPropertyValue('--text-normal').trim();
state.cssKey = await guest.insertCSS(`:root { --background: ${background} !important; --foreground: ${foreground} !important; } body { background-color: ${background} !important; color: ${foreground} !important; }`);
const theme = await guest.executeJavaScript(`({background:getComputedStyle(document.body).backgroundColor,foreground:getComputedStyle(document.body).color})`);
state.contextFixtureInserted = inserted;
return JSON.stringify({ before, inserted, theme, noPromptSubmitted:true });
