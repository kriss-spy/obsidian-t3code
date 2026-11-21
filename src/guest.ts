// Minimal public Electron webview contract. No privileged preload or desktop bridge.
export interface Guest extends HTMLElement {
  getURL(): string;
  loadURL(url: string): Promise<void>;
  executeJavaScript(code: string): Promise<unknown>;
  getWebContentsId(): number;
}
export function createGuest(document: Document, partition: string, url: string): Guest {
  const guest = document.createElement('webview') as Guest;
  guest.classList.add('t3-code-guest');
  guest.setAttribute('partition', partition);
  guest.setAttribute('webpreferences', 'contextIsolation=yes,sandbox=yes,nodeIntegration=no,webSecurity=yes');
  guest.setAttribute('src', url);
  // Do not enable allowpopups, disablewebsecurity, nodeintegration, or preload.
  return guest;
}
