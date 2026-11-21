import path from 'node:path';
import { electronHost } from './electron-host';
import { ItemView, requestUrl, type WorkspaceLeaf, type ViewStateResult } from 'obsidian';
import type T3Plugin from './main';
import { compatibility, parseDescriptor, partitionFor, savedTarget, serverOrigin } from './connection';
import { verifyLocalServer, verifiedCompatibility } from './local-server';
import { HostSession } from './host-contract';
import { HostBridge } from './host-bridge';
import { createGuest, type Guest } from './guest';
export const VIEW_TYPE = 't3-code-workspace';
export class T3View extends ItemView {
  private guest?: Guest;
  private bridge?: HostBridge;
  private generation = 0;
  private route = '/';
  private cleanup: Array<() => void> = [];
  private connecting?: Promise<void>;
  private cssKey?: string;
  constructor(leaf: WorkspaceLeaf, private plugin: T3Plugin) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'T3 Code'; }
  getIcon() { return 'terminal'; }
  getState() { return { target: savedTarget(this.route, this.plugin.settings.origin) }; }
  async setState(state: unknown, result: ViewStateResult) {
    if (state && typeof state === 'object' && 'target' in state) this.route = savedTarget(state.target, this.plugin.settings.origin);
    await super.setState(state, result);
    await this.connect();
  }
  async onOpen() { this.route = this.plugin.settings.target; await this.connect(); }
  async onClose() { this.disconnect(); }
  disconnect() {
    ++this.generation;
    for (const fn of this.cleanup.splice(0)) fn();
    this.bridge?.close();
    this.bridge = undefined;
    this.guest?.remove();
    this.guest = undefined;
    this.cssKey = undefined;
  }
  connect(transientURL?: string): Promise<void> {
    const task = this.connectOnce(transientURL);
    this.connecting = task;
    return task;
  }
  private async connectOnce(transientURL?: string) {
    this.disconnect();
    const generation = this.generation;
    const hostWindow = this.contentEl.ownerDocument.defaultView ?? window;
    const current = () => generation === this.generation;
    this.contentEl.empty();
    this.contentEl.addClass('t3-code-workspace');
    this.contentEl.createEl('p', { text: 'Checking T3 compatibility…' });
    let origin = this.plugin.settings.origin;
    try {
      origin = serverOrigin(origin);
      const response = await requestUrl({ url: origin + '/.well-known/t3/environment', throw: false });
      if (!current()) return;
      if (response.status !== 200) throw new Error('T3 descriptor unavailable.');
      const descriptor = parseDescriptor(response.json);
      if (descriptor.serverVersion !== '0.1.11' || descriptor.orchestrationProtocolVersion !== 2) throw new Error(compatibility(descriptor).message);
      const proof = await verifyLocalServer(origin, descriptor, path.join(this.plugin.vaultRoot, this.app.vault.configDir), async url => {
        const proof = await requestUrl({url, throw:false});
        if (proof.status !== 200 || !proof.headers['content-type']?.includes('application/json')) throw new Error(compatibility(descriptor).message + ' Install the matching T3 host patch and client bundle.');
        return proof.json as unknown;
      }, async url => {const asset=await requestUrl({url,throw:false});if(asset.status!==200)throw new Error('Verified T3 client asset unavailable.');return asset.arrayBuffer;});
      if (!current()) return;
      const status = verifiedCompatibility(descriptor, origin, proof);
      this.plugin.diagnostic = status.message;
      if (!status.supported) { this.showUnavailable(status.message, origin); return; }
      const target = new URL(transientURL ?? this.route, origin);
      if (target.origin !== origin) throw new Error('T3 navigation left the verified server.');
      target.searchParams.set('obsidian-host', '1');
      const guest = createGuest(this.contentEl.ownerDocument, partitionFor(this.plugin.vaultRoot, origin), target.href);
      guest.classList.add('t3-code-pending');
      this.guest = guest;
      const session = new HostSession(this.plugin.vaultRoot, descriptor.environmentId);
      const bridge = new HostBridge(guest, origin, session, request => this.plugin.openMarkdown(request, descriptor.environmentId, () => current() && (request.route === undefined || new URL(guest.getURL()).pathname === request.route), this.leaf), async route => {if(current()) await electronHost().shell.openExternal(origin + route);}, message => {if(current()) this.plugin.diagnostic = status.message + ' ' + message;});
      this.bridge = bridge;
      const navigate = (event: Event) => {
        if (!current()) return;
        const url = (event as Event & {url?: string}).url;
        this.disconnect();
        if (!url || new URL(url).origin !== origin) { this.showUnavailable('Navigation left the verified T3 server.', origin); return; }
        // Removing the old guest prevents pairing redirects from rendering an unscoped document.
        void this.connect(url);
      };
      const gone = () => { if(current()) {this.disconnect();this.showUnavailable('The T3 guest stopped. Reconnect to resume.', origin);} };
      const routeChanged = (event: Event) => {
        if (!current()) return;
        const url = (event as Event & {url?:string}).url;
        if (!url) return;
        const route = savedTarget(url, origin);
        if (route === '/' && new URL(url).pathname !== '/') return;
        this.route = route;
        this.plugin.settings.target = this.route;
        void this.plugin.saveSettings();
      };
      guest.addEventListener('will-navigate', navigate);
      guest.addEventListener('render-process-gone', gone);
      guest.addEventListener('did-navigate-in-page', routeChanged);
      this.cleanup.push(() => guest.removeEventListener('will-navigate', navigate), () => guest.removeEventListener('render-process-gone', gone), () => guest.removeEventListener('did-navigate-in-page', routeChanged));
      this.contentEl.empty();
      this.contentEl.appendChild(guest);
      await new Promise<void>((resolve, reject) => {
        const timer = hostWindow.setTimeout(() => reject(new Error('T3 guest loading timed out.')), 15000);
        const ready = () => { hostWindow.clearTimeout(timer); resolve(); };
        guest.addEventListener('dom-ready', ready, {once:true});
        this.cleanup.push(() => { hostWindow.clearTimeout(timer);guest.removeEventListener('dom-ready', ready);resolve(); });
      });
      if (!current()) return;
      await bridge.initialize();
      if (!current()) return;
      const timer = hostWindow.setInterval(() => { void bridge.poll().catch(() => {
        if(current()) {this.disconnect();this.showUnavailable('T3 host integration disconnected. Reconnect to resume.', origin);}
      }); }, 100);
      this.cleanup.push(() => hostWindow.clearInterval(timer));
      await this.syncAppearance();
      if (current()) guest.classList.remove('t3-code-pending');
    } catch (error) {
      if (!current()) return;
      this.disconnect();
      this.plugin.diagnostic = error instanceof Error ? error.message : 'T3 connection failed.';
      this.showUnavailable(this.plugin.diagnostic, origin);
    }
  }
  async appendContext(text: string) {
    await this.connecting;
    if (!this.bridge || !this.guest) throw new Error('Connect and pair with a supported T3 server before adding context.');
    await this.bridge.appendContext(text);
    this.guest.focus();
  }
  async syncAppearance() {
    const guest = this.guest;
    if (!guest) return;
    const oldKey = this.cssKey;
    this.cssKey = undefined;
    try {
      if (oldKey) await guest.removeInsertedCSS(oldKey);
      if (guest !== this.guest || !this.plugin.settings.followAppearance) return;
      const colors = getComputedStyle(this.contentEl.ownerDocument.body);
      const value = (name: string) => colors.getPropertyValue(name).trim().replace(/[;{}]/g, '');
      const mapping: Record<string,string> = {
        background:'--background-primary', foreground:'--text-normal', sidebar:'--background-secondary',
        'sidebar-foreground':'--text-normal', card:'--background-primary', 'card-foreground':'--text-normal',
        popover:'--background-secondary', 'popover-foreground':'--text-normal', muted:'--background-secondary',
        'muted-foreground':'--text-muted', border:'--background-modifier-border', input:'--background-modifier-border',
        primary:'--interactive-accent', ring:'--interactive-accent',
      };
      const variables = Object.entries(mapping).map(([name,host]) => `--${name}:${value(host)}!important`).join(';');
      const css = `:root{${variables};--font-sans:${colors.fontFamily.replace(/[;{}]/g, '')}!important}html,body{background-color:var(--background)!important;color:var(--foreground)!important;font-family:var(--font-sans)!important}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}}`;
      const key = await guest.insertCSS(css);
      if (guest === this.guest) this.cssKey = key;
    } catch { /* A closing document has no remaining stylesheet to update. */ }
  }
  private showUnavailable(message: string, origin: string) {
    this.contentEl.empty();
    this.contentEl.createEl('p', { text: message });
    this.contentEl.createEl('a', { text: 'Open the normal T3 app', href: serverOrigin(origin), attr: { target: '_blank', rel: 'noopener noreferrer' } });
    this.contentEl.createEl('p', { text: 'Development build. See the installation guide for the required T3 host patch.' });
    const retry = this.contentEl.createEl('button', { text: 'Check again' });
    retry.onclick = () => { void this.connect(); };
  }
}
