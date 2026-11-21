import { randomUUID } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { containsDirectory } from './scope';

export const REFERENCE_MIME = 'application/x-t3-obsidian-reference-v1';
export class ReferenceDrags {
  private pending = new Map<string, {paths:string[]; expires:number}>();
  capture(paths: string[]) {
    this.pending.clear();
    const token = randomUUID();
    this.pending.set(token, {paths:paths.slice(0,100), expires:Date.now()+60000});
    return token;
  }
  async consume(token: string, vaultRoot: string): Promise<string[]> {
    const drag = this.pending.get(token);
    this.pending.delete(token);
    if (!drag || drag.expires < Date.now()) return [];
    const paths = new Set<string>();
    for (const file of drag.paths) {
      try {
        const canonical = await realpath(path.resolve(vaultRoot, file));
        if (!containsDirectory(vaultRoot, canonical)) continue;
        const info = await stat(canonical);
        if (info.isDirectory() || (info.isFile() && /\.md$/i.test(canonical))) paths.add(canonical);
      } catch { /* A moved or deleted source cannot be dropped. */ }
    }
    return [...paths];
  }
}

export interface ReferenceDropTarget {
  target: string;
  route: string;
  rect: {x:number;y:number;width:number;height:number};
  viewport: {width:number;height:number};
}
