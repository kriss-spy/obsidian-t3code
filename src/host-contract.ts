import type { SearchEntry } from './aliases';
import { externalWebUrl } from './connection';
import { randomUUID } from 'node:crypto';
import { threadScope, canonicalDirectory, type Project, type Thread } from './scope';

export const HOST_PROTOCOL = 1;
export const ADAPTER_BUILD = 'obsidian-host-v1.10';
export const SCOPE_COVERAGE = ['active','pinned','working','snoozed','settled','recents','search','archive','projects','routes','drafts','reconnect','side-chats','onboarding'] as const;
export const T3_REVISION = '59651c1761f6c63e9b6056839067066968e6a406';
export const MAX_SCOPE_ROWS = 20000;
export interface ScopeRow {
  id: string;
  projectId: string;
  workspaceRoot: string | null;
  worktreePath: string | null;
  kind: 'project' | 'thread';
}
export interface ScopeRequest { type: 'scope'; id: string; generation: string; environmentId: string; rows: ScopeRow[] }
export interface FileRequest {
  type: 'file'; id: string; generation: string; environmentId: string;
  path: string; line?: number; column?: number; route?: string; newTab: boolean;
}
export interface ExternalRequest {type:'external'; id:string; generation:string; environmentId:string; path:string}
export interface BrowserRequest {type:'browser'; id:string; generation:string; environmentId:string; url:string; route:string}
export interface FileCheckRequest {type:'file-check'; id:string; generation:string; environmentId:string; path:string; route:string}
export interface AliasRequest {type:"aliases"; id:string; generation:string; environmentId:string; cwd:string; query:string; entries:SearchEntry[]; limit:number; route:string}
export interface ReferenceRequest {type:"references"; id:string; generation:string; environmentId:string; token:string; route:string}
export type HostRequest = ScopeRequest | FileRequest | ExternalRequest | BrowserRequest | FileCheckRequest | AliasRequest | ReferenceRequest;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 8192 && !v.includes('\0');
const position = (v: unknown) => v === undefined || (Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 10000000);
export function parseHostRequest(value: unknown, generation: string): HostRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid host request.');
  const r = value as Record<string, unknown>;
  if (!text(r.id) || r.generation !== generation || !text(r.environmentId)) throw new Error('Invalid request identity.');
  if (r.type === 'browser' && text(r.url) && text(r.route)) return {type:'browser',id:r.id,generation,environmentId:r.environmentId,url:externalWebUrl(r.url),route:r.route};
  if (r.type === 'references' && text(r.token) && text(r.route)) return {type:'references',id:r.id,generation,environmentId:r.environmentId,token:r.token,route:r.route};
  if (r.type === 'aliases' && text(r.cwd) && typeof r.query === 'string' && r.query.length <= 256 && text(r.route) && Number.isSafeInteger(r.limit) && (r.limit as number) > 0 && (r.limit as number) <= 500 && Array.isArray(r.entries) && r.entries.length <= 500) {
    const entries: SearchEntry[] = [];
    for (const value of r.entries as unknown[]) {
      if (!value || typeof value !== 'object') throw new Error('Invalid alias search entry.');
      const entry = value as Record<string, unknown>;
      if (!text(entry.path) || (entry.kind !== 'file' && entry.kind !== 'directory') || (entry.ignored !== undefined && typeof entry.ignored !== 'boolean')) throw new Error('Invalid alias search entry.');
      entries.push({path:entry.path,kind:entry.kind,ignored:entry.ignored});
    }
    return {type:'aliases',id:r.id,generation,environmentId:r.environmentId,cwd:r.cwd,query:r.query,route:r.route,limit:r.limit as number,entries};
  }
  if (r.type === 'file-check' && text(r.path) && text(r.route)) return {type:'file-check',id:r.id,generation,environmentId:r.environmentId,path:r.path,route:r.route};
  if (r.type === 'external' && text(r.path) && /^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_%:-]+$/.test(r.path)) return {type:'external',id:r.id,generation,environmentId:r.environmentId,path:r.path};
  if (r.type === 'file' && text(r.path) && position(r.line) && position(r.column) && typeof r.newTab === 'boolean' && (r.route === undefined || text(r.route))) {
    return {type:'file', id:r.id, generation, environmentId:r.environmentId, path:r.path,
      line:r.line as number | undefined, column:r.column as number | undefined, route:r.route, newTab:r.newTab};
  }
  if (r.type !== 'scope' || !Array.isArray(r.rows) || r.rows.length > MAX_SCOPE_ROWS) throw new Error('Invalid scope request.');
  const rows: ScopeRow[] = [];
  const seen = new Set<string>();
  for (const value of r.rows) {
    if (!value || typeof value !== 'object') throw new Error('Invalid scope row.');
    const row = value as ScopeRow;
    if (!text(row.id) || !text(row.projectId) || !(text(row.workspaceRoot) || (row.kind === 'thread' && row.workspaceRoot === null)) ||
        (row.kind !== 'project' && row.kind !== 'thread') ||
        (row.worktreePath !== null && !text(row.worktreePath)) || seen.has(row.kind + ':' + row.id)) throw new Error('Invalid scope row.');
    seen.add(row.kind + ':' + row.id);
    rows.push({id:row.id, projectId:row.projectId, workspaceRoot:row.workspaceRoot, worktreePath:row.worktreePath, kind:row.kind});
  }
  return {type:'scope', id:r.id, generation, environmentId:r.environmentId, rows};
}

// The caller must independently establish this server's local filesystem identity.
export class HostSession {
  readonly generation = randomUUID();
  private active = true;
  constructor(readonly vaultRoot: string, readonly localEnvironmentId: string) {}
  invalidate() { this.active = false; }
  scope(value: unknown) {
    if (!this.active) throw new Error('Host session ended.');
    const request = parseHostRequest(value, this.generation);
    if (request.type !== 'scope') throw new Error('Expected scope request.');
    const decisions = request.rows.map(row => {
      const project: Project | undefined = row.workspaceRoot === null ? undefined : {id:row.projectId, environmentId:request.environmentId, workspaceRoot:row.workspaceRoot};
      const thread: Thread = {projectId:row.projectId, environmentId:request.environmentId, worktreePath:row.kind === 'project' ? null : row.worktreePath};
      return {row, decision:threadScope(this.vaultRoot, this.localEnvironmentId, thread, project)};
    });
    const allowed = decisions.filter(({decision}) => decision.included).map(({row}) => row.kind + ':' + row.id);
    const rootProjects = decisions.filter(({row, decision}) => row.kind === 'project' && decision.included && decision.directory === canonicalDirectory(this.vaultRoot)).map(({row}) => row.id);
    const diagnostics = decisions.flatMap(({row,decision}) => decision.included ? [] : [{id:row.id,kind:row.kind,reason:decision.reason}]);
    return {id:request.id, generation:this.generation, allowed, rootProjects, diagnostics};
  }
}
