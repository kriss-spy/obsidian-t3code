import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { containsDirectory } from './scope';

export interface SearchEntry { path: string; kind: 'file' | 'directory'; ignored?: boolean }
export interface AliasNote { path: string; aliases: readonly string[] }
const normalize = (value: string) => value.normalize('NFC').toLowerCase();

// Metadata events replace only the affected note. Filesystem identity is checked at query time.
export class AliasIndex {
  private notes = new Map<string, readonly string[]>();
  update(note: AliasNote) { this.notes.set(note.path, note.aliases.map(normalize)); }
  remove(file: string) { this.notes.delete(file); }
  async search(vaultRoot: string, cwd: string, query: string, entries: readonly SearchEntry[], limit: number): Promise<SearchEntry[]> {
    let root: string;
    try {
      root = await realpath(cwd);
      if (!containsDirectory(vaultRoot, root) || !(await stat(root)).isDirectory()) return [];
    } catch { return []; }
    const matched: SearchEntry[] = [];
    const seen = new Set<string>();
    const add = async (absolute: string, entry: SearchEntry) => {
      try {
        const canonical = await realpath(absolute);
        if (!containsDirectory(root, canonical) || !containsDirectory(vaultRoot, canonical) || seen.has(canonical)) return;
        const info = await stat(canonical);
        if (entry.kind === 'file' ? !info.isFile() : !info.isDirectory()) return;
        seen.add(canonical);
        matched.push({...entry, path:path.relative(root, canonical).split(path.sep).join('/')});
      } catch { /* Removed files cannot be offered. */ }
    };
    for (const entry of entries) {
      if (matched.length >= limit) break;
      await add(path.resolve(cwd, entry.path), entry);
    }
    const needle = normalize(query.trim());
    if (!needle) return matched;
    for (const [file, aliases] of this.notes) {
      if (matched.length >= limit) break;
      if (!aliases.some(alias => alias.includes(needle))) continue;
      await add(path.join(vaultRoot, file), {path:file,kind:'file'});
    }
    return matched;
  }
}
export function metadataAliases(value: unknown): string[] {
  return (typeof value === 'string' ? [value] : Array.isArray(value) ? value : []).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}
