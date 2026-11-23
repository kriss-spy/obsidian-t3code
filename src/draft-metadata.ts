import type { CachedMetadata, MetadataCache } from 'obsidian';

// Obsidian does not index custom Markdown extensions. Parse the exact draft with its native worker.
export async function draftMetadata(cache: MetadataCache, text: string): Promise<CachedMetadata> {
  const parser = cache as MetadataCache & {
    computeMetadataAsync?: (data: ArrayBuffer) => Promise<CachedMetadata | undefined>;
  };
  if (typeof parser.computeMetadataAsync !== 'function') {
    throw new Error('This Obsidian version cannot parse temporary drafts. The draft is preserved.');
  }
  const result = await parser.computeMetadataAsync(new TextEncoder().encode(text).buffer);
  if (!result || typeof result !== 'object') throw new Error('Obsidian could not parse this draft. The draft is preserved.');
  return result;
}
