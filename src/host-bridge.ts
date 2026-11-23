import { setTimeout as delay } from 'node:timers/promises';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { canonicalDirectory, containsDirectory } from './scope';
import type { AliasRequest } from './host-contract';
import type { SearchEntry } from './aliases';
import type { ReferenceDropTarget } from './references';
import type { HostPalette } from './theme';
import { serverOrigin, savedTarget } from './connection';
import type { Guest } from './guest';
import { HostSession, HOST_PROTOCOL, ADAPTER_BUILD, SCOPE_COVERAGE, parseHostRequest, T3_REVISION, type FileRequest } from './host-contract';

// Admission stays in compatibility(). This transport cannot approve a build.
export class HostBridge {
  private closed = false;
  private polling = false;
  private openingProject?: {root:string;task:Promise<void>};
  constructor(
    private guest: Pick<Guest, 'getURL' | 'executeJavaScript'>,
    private origin: string,
    private session: HostSession,
    private onFile: (request: FileRequest) => Promise<boolean>,
    private onExternal: (path: string) => Promise<void> = async () => {},
    private onDiagnostic: (message: string) => void = () => {},
    private onAliases: (request: AliasRequest) => Promise<SearchEntry[]> = async () => [],
    private onReferences: (token: string) => Promise<string[]> = async () => [],
    private onBrowser: (url: string) => Promise<void> = async () => { throw new Error('System browser opening is unavailable.'); },
  ) { this.origin = serverOrigin(origin); }
  private assertCurrent() {
    if (this.closed || new URL(this.guest.getURL()).origin !== this.origin) {
      this.close();
      throw new Error('Guest navigation ended the host session.');
    }
  }
  private async evaluate(code: string) {
    this.assertCurrent();
    const result = await this.guest.executeJavaScript(code);
    this.assertCurrent();
    return result;
  }
  async initialize() {
    const identity = {generation:this.session.generation, environmentId:this.session.localEnvironmentId, vaultRoot:this.session.vaultRoot,requiresLocalProof:true};
    let result: Record<string, unknown> | null | string = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      result = await this.evaluate(`(() => {
      const api = window.t3ObsidianHostV1;
      if (!api) return "pending";
      if (api.protocol !== ${HOST_PROTOCOL} || api.revision !== ${JSON.stringify(T3_REVISION)} || api.themeCapability !== 2 || api.fontCapability !== 1) return null;
      return api.initialize(${JSON.stringify(identity)});
    })()`) as Record<string, unknown> | null | string;
      if (result !== 'pending') break;
      await delay(50);
    }
    if (!result || typeof result !== 'object' || result.protocol !== HOST_PROTOCOL || result.revision !== T3_REVISION || result.generation !== identity.generation || result.build !== ADAPTER_BUILD || !Array.isArray(result.coverage) || SCOPE_COVERAGE.some(entry => !(result.coverage as unknown[]).includes(entry))) {
      this.close();
      throw new Error('Host handshake failed.');
    }
  }
  async localConnectionReady() { return await this.evaluate('window.t3ObsidianHostV1.localConnectionReady()') === true; }
  async configureTheme(token: string, revision: number, enabled: boolean, palette?: HostPalette) {
    return this.evaluate(`window.t3ObsidianHostV1.configureTheme(${JSON.stringify({generation:this.session.generation,token,revision,enabled,palette})})`);
  }
  async themeStatus(): Promise<{token:string;following:boolean;requested:boolean;suspended:boolean} | null> {
    const value = await this.evaluate(`window.t3ObsidianHostV1.themeStatus(${JSON.stringify({generation:this.session.generation})})`);
    if(value===null)return null;
    if(!value || typeof value!=='object' || !('version' in value) || value.version!==2 || !('token' in value) || typeof value.token!=='string' || !('suspended' in value) || typeof value.suspended!=='boolean' || !('following' in value) || typeof value.following!=='boolean' || !('requested' in value) || typeof value.requested!=='boolean')throw Error('Invalid theme host status.');
    return {token:value.token,following:value.following,requested:value.requested,suspended:value.suspended};
  }
  async fontsChanged() {
    await this.evaluate(`window.t3ObsidianHostV1.fontsChanged(${JSON.stringify({generation:this.session.generation})})`);
  }
  async readLocalProof(file: string, machineFile?: string) { return this.evaluate(`window.t3ObsidianHostV1.readLocalProof(${JSON.stringify({generation:this.session.generation,path:file,machinePath:machineFile})})`); }
  async confirmLocal() {
    if (await this.evaluate(`window.t3ObsidianHostV1.confirmLocal(${JSON.stringify({generation:this.session.generation})})`) !== true) throw new Error('Local T3 handshake failed.');
  }
  async poll() {
    if (this.polling || this.closed) return;
    this.polling = true;
    try {
      const batch = await this.evaluate('window.t3ObsidianHostV1.drain()');
      if (!Array.isArray(batch) || batch.length > 8) throw new Error('Invalid host request batch.');
      for (const value of batch) {
        this.assertCurrent();
        const request = parseHostRequest(value, this.session.generation);
        if (request.type === 'browser') {
          let handled = false;
          if (request.environmentId === this.session.localEnvironmentId && request.route === new URL(this.guest.getURL()).pathname) {
            try { await this.onBrowser(request.url); handled = true; }
            catch { this.onDiagnostic('Could not open the link in the system browser.'); }
          }
          await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify({id:request.id,generation:this.session.generation,handled})})`);
          continue;
        }
        if (request.type === 'references') {
          const paths = request.environmentId === this.session.localEnvironmentId && request.route === new URL(this.guest.getURL()).pathname ? await this.onReferences(request.token) : [];
          await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify({id:request.id,generation:this.session.generation,paths})})`);
          continue;
        }
        if (request.type === 'aliases') {
          const entries = request.environmentId === this.session.localEnvironmentId && request.route === new URL(this.guest.getURL()).pathname ? await this.onAliases(request) : [];
          await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify({id:request.id,generation:this.session.generation,entries})})`);
          continue;
        }
        if (request.type === 'file-check') {
          let handled = false;
          if (request.environmentId === this.session.localEnvironmentId && request.route === new URL(this.guest.getURL()).pathname && path.isAbsolute(request.path) && /\.md$/i.test(request.path)) {
            try { const resolved = await realpath(request.path); handled = /\.md$/i.test(resolved) && (await stat(resolved)).isFile(); } catch { /* Missing files have no native action. */ }
          }
          await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify({id:request.id,generation:this.session.generation,handled})})`);
          continue;
        }
        if (request.type === 'external') {
          if (savedTarget(request.path, this.origin) !== request.path) throw new Error('Invalid external T3 route.');
          await this.onExternal(request.path);
          await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify({id:request.id,generation:this.session.generation,handled:true})})`);
          continue;
        }
        const response = request.type === 'scope' ? this.session.scope(request) : {
          id:request.id, generation:this.session.generation,
          handled:request.environmentId === this.session.localEnvironmentId && (request.route === undefined || request.route === new URL(this.guest.getURL()).pathname) && await this.onFile(request),
        };
        if ('diagnostics' in response && response.diagnostics.length) this.onDiagnostic([...new Set(response.diagnostics.map(d => d.reason))].join(' '));
        await this.evaluate(`window.t3ObsidianHostV1.reply(${JSON.stringify(response)})`);
      }
    } catch (error) { this.close(); throw error; }
    finally { this.polling = false; }
  }
  async appendContext(text: string) {
    let route = new URL(this.guest.getURL()).pathname;
    let target: unknown = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (new URL(this.guest.getURL()).pathname !== route) throw new Error('The T3 target changed. Context was not added.');
      target = await this.evaluate('window.t3ObsidianHostV1.composerTarget()');
      if (typeof target === 'string') break;
      await delay(50);
    }
    if (typeof target !== 'string') {
      const prepared = await this.evaluate(`window.t3ObsidianHostV1.prepareComposer(${JSON.stringify(route)})`);
      if (typeof prepared !== 'string') throw new Error('Use vault folder or choose an in-vault project before adding context.');
      route = prepared;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (new URL(this.guest.getURL()).pathname !== route) throw new Error('The T3 target changed. Context was not added.');
        target = await this.evaluate('window.t3ObsidianHostV1.composerTarget()');
        if (typeof target === 'string') break;
        await delay(50);
      }
      if (typeof target !== 'string') throw new Error('The in-vault composer is unavailable. Context was not added.');
    }
    const inserted = await this.evaluate(`window.t3ObsidianHostV1.appendContext(${JSON.stringify({generation:this.session.generation, target, text})})`);
    if (inserted !== true) throw new Error('The T3 target changed or its composer is unavailable. Context was not added.');
  }
  openProject(directory: string): Promise<void> {
    const root = canonicalDirectory(directory);
    if (this.openingProject) {
      if (this.openingProject.root === root) return this.openingProject.task;
      return Promise.reject(new Error('Another folder is opening. Try again after it finishes.'));
    }
    const task = this.openProjectOnce(root).finally(() => {this.openingProject = undefined;});
    this.openingProject = {root,task};
    return task;
  }
  private async openProjectOnce(root: string) {
    if (!containsDirectory(this.session.vaultRoot, root)) throw new Error('Choose a folder inside this vault.');
    const route = new URL(this.guest.getURL()).pathname;
    const candidates = await this.evaluate('window.t3ObsidianHostV1.projectRoots()');
    if (!Array.isArray(candidates) || candidates.length > 20000) throw new Error('T3 projects are unavailable.');
    let existingId: string | null = null;
    for (const value of candidates as unknown[]) {
      if (!value || typeof value !== 'object') continue;
      const candidate = value as Record<string, unknown>;
      if (candidate.environmentId !== this.session.localEnvironmentId || typeof candidate.id !== 'string' || typeof candidate.workspaceRoot !== 'string') continue;
      try { if (canonicalDirectory(candidate.workspaceRoot) === root) {existingId = candidate.id; break;} } catch { /* Unverified project roots cannot match. */ }
    }
    if (route !== new URL(this.guest.getURL()).pathname) throw new Error('The T3 target changed. The folder was not opened.');
    const opened = await this.evaluate(`window.t3ObsidianHostV1.openProject(${JSON.stringify({generation:this.session.generation,environmentId:this.session.localEnvironmentId,path:root,existingId,route})})`);
    if (opened !== true) throw new Error('The folder could not be opened, or the T3 target changed.');
  }
  async referenceDropTarget(): Promise<ReferenceDropTarget | null> {
    const value = await this.evaluate('window.t3ObsidianHostV1.referenceDropTarget()');
    if (!value || typeof value !== 'object') return null;
    const result = value as ReferenceDropTarget;
    if (typeof result.target !== 'string' || result.route !== new URL(this.guest.getURL()).pathname || !result.rect || !result.viewport) return null;
    if (![result.rect.x,result.rect.y,result.rect.width,result.rect.height,result.viewport.width,result.viewport.height].every(n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<100000)) return null;
    if (result.rect.width<=0 || result.rect.height<=0 || result.viewport.width<=0 || result.viewport.height<=0) return null;
    return result;
  }
  async appendReferences(token: string, expected: ReferenceDropTarget) {
    if (expected.route !== new URL(this.guest.getURL()).pathname) throw new Error('The T3 target changed. References were not added.');
    const paths = await this.onReferences(token);
    if (!paths.length) throw new Error('The dragged reference expired or its source is unavailable.');
    const handled = await this.evaluate(`window.t3ObsidianHostV1.appendReferences(${JSON.stringify({generation:this.session.generation,target:expected.target,paths})})`);
    if (handled !== true) throw new Error('The T3 target changed. References were not added.');
  }
  async invalidateAliases() { await this.evaluate('window.t3ObsidianHostV1.invalidateAliases()'); }
  close() {
    if(!this.closed){
      try {void this.guest.executeJavaScript(`window.t3ObsidianHostV1?.closeTheme(${JSON.stringify({generation:this.session.generation})})`).catch(()=>{});}
      catch {/* Electron can throw synchronously after the guest has detached. */}
    }
    this.closed = true; this.session.invalidate();
  }
}
