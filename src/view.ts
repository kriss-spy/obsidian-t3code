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
  private appearanceGeneration = 0;
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
  resetTarget() { this.route = '/'; }
  disconnect() {
    ++this.generation;
    ++this.appearanceGeneration;
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
      const bridge = new HostBridge(guest, origin, session, request => this.plugin.openMarkdown(request, descriptor.environmentId, () => current() && (request.route === undefined || new URL(guest.getURL()).pathname === request.route), this.leaf), async route => {if(current()) await electronHost().shell.openExternal(origin + route);}, message => {if(current()) this.plugin.diagnostic = status.message + ' ' + message;}, request => this.plugin.aliases.search(this.plugin.vaultRoot, request.cwd, request.query, request.entries, request.limit), token => this.plugin.referenceDrags.consume(token, this.plugin.vaultRoot));
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
  async prepareReferenceDrop(token: string, expectedRoute: string = this.getState().target) {
    const bridge = this.bridge, guest = this.guest, generation = this.generation;
    if (!bridge || !guest) return null;
    if(this.getState().target!==expectedRoute)return null;
    await this.app.workspace.revealLeaf(this.leaf);
    this.app.workspace.setActiveLeaf(this.leaf,{focus:true});
    const hostWindow=this.contentEl.ownerDocument.defaultView ?? window;
    let target=await bridge.referenceDropTarget();
    for(let attempt=0;!target && attempt<20;attempt++){
      if(generation!==this.generation || this.getState().target!==expectedRoute)return null;
      await new Promise<void>(resolve=>hostWindow.setTimeout(resolve,25));
      target=await bridge.referenceDropTarget();
    }
    if(target?.route!==expectedRoute)return null;
    if (!target || bridge !== this.bridge || guest !== this.guest) return null;
    const box = guest.getBoundingClientRect();
    if (box.width<=0 || box.height<=0) return null;
    const scaleX = box.width / target.viewport.width, scaleY = box.height / target.viewport.height;
    const zone = this.contentEl.ownerDocument.createElement('div');
    zone.className = 't3-code-reference-drop';
    zone.textContent = 'Drop reference into T3';
    const values = {left:box.x+target.rect.x*scaleX,top:box.y+target.rect.y*scaleY,width:target.rect.width*scaleX,height:target.rect.height*scaleY};
    for (const [key,value] of Object.entries(values)) zone.style.setProperty('--t3-drop-'+key,value+'px');
    this.contentEl.ownerDocument.body.appendChild(zone);
    const cancel = () => {zone.remove();const index=this.cleanup.indexOf(cancel);if(index>=0)this.cleanup.splice(index,1);};
    this.cleanup.push(cancel);
    return {element:zone,cancel,complete:async()=>{
      cancel();
      if (generation !== this.generation || bridge !== this.bridge) throw new Error('The T3 target changed. References were not added.');
      await bridge.appendReferences(token,target);
      await this.app.workspace.revealLeaf(this.leaf);
      this.app.workspace.setActiveLeaf(this.leaf,{focus:true});
      guest.focus();
    }};
  }
  async openProject(directory: string) { await this.connecting; if (!this.bridge) throw new Error('Connect to a supported T3 server first.'); await this.bridge.openProject(directory); this.guest?.focus(); }
  async invalidateAliases() { try { await this.bridge?.invalidateAliases(); } catch { /* A closing guest has no search to refresh. */ } }
  async appendContext(text: string) {
    await this.connecting;
    if (!this.bridge || !this.guest) throw new Error('Connect and pair with a supported T3 server before adding context.');
    await this.bridge.appendContext(text);
    this.guest.focus();
  }
  async syncAppearance() {
    const generation = ++this.appearanceGeneration;
    const guest = this.guest;
    if (!guest) return;
    const oldKey = this.cssKey;
    this.cssKey = undefined;
    try {
      if (oldKey) await guest.removeInsertedCSS(oldKey);
      if (guest !== this.guest || generation !== this.appearanceGeneration) return;
      const hostWindow = this.contentEl.ownerDocument.defaultView ?? window;
      const font = hostWindow.getComputedStyle(this.contentEl.ownerDocument.body).fontFamily.replace(/[;{}]/g, '');
      // T3 owns all palette colors. Host color overrides break T3's theme editor.
      const fontCSS = this.plugin.settings.followAppearance ? `:root{--font-sans:${font}!important}html,body{font-family:var(--font-sans)!important}` : '';
      const css = fontCSS + '@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}}';
      const key = await guest.insertCSS(css);
      if (guest === this.guest && generation === this.appearanceGeneration) this.cssKey = key;
      else await guest.removeInsertedCSS(key);
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
