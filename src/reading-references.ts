import path from 'node:path';
import type T3Plugin from './main';

// Read rendered source attributes, never Electron's app:// resource URL.
export function readingReference(plugin: T3Plugin, target: Element): string | null {
  if (!target.closest('.markdown-reading-view')) return null;
  const image = target.closest('img');
  const embed = target.closest('.internal-embed[src]');
  const anchor = target.closest('a[href]');
  const source = image
    ? embed?.getAttribute('src') ?? image.getAttribute('src')
    : anchor?.getAttribute('data-href') ?? anchor?.getAttribute('href');
  if (!source) return null;
  let destination: string;
  if (/^https?:\/\//i.test(source)) {
    try { destination = new URL(source).href; } catch { return null; }
  } else {
    if (/^[a-z][a-z\d+.-]*:/i.test(source)) return null;
    const leaf = plugin.app.workspace.getLeavesOfType('markdown').find(leaf => leaf.view.containerEl.contains(target));
    const sourcePath = (leaf?.view as {file?:{path:string}} | undefined)?.file?.path;
    if (!sourcePath) return null;
    const linkpath = source.split('#')[0];
    const file = plugin.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
    if (!file) return null;
    destination = path.resolve(plugin.vaultRoot, file.path);
    const fragment = source.indexOf('#');
    if (fragment >= 0) destination += source.slice(fragment);
  }
  const label = (image ? image.getAttribute('alt') ?? '' : anchor?.textContent ?? '')
    .replace(/\\/g, '\\\\').replace(/([[\]])/g, '\\$1').replace(/[\r\n]+/g, ' ');
  destination = destination.replace(/\\/g, '/').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/[\r\n]/g, '');
  return `${image ? '!' : ''}[${label}](<${destination}>)`;
}
