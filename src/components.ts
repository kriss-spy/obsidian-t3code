import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

export type ComponentKind = 'core' | 'fonts';
export interface ComponentAsset { version: string; kind: ComponentKind; url: string; sha256: string; bytes: number }
interface ComponentFile { path: string; sha256: string; data: string }
interface ComponentBundle { version: string; kind: ComponentKind; files: ComponentFile[] }
interface Receipt { version: string; sha256: string; files: Array<{ path: string; sha256: string }> }
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const receiptName = (kind: ComponentKind) => `.obsidian-t3-${kind}.json`;
const optionalCSS = 'obsidian-extra-fonts.css';

function filePath(value: unknown): value is string {
  return typeof value === 'string' && value.length < 240 && !value.startsWith('/') &&
    value.split('/').every(part => /^[a-zA-Z0-9_.-]+$/.test(part) && part !== '.' && part !== '..');
}

export function decodeComponents(bytes: Uint8Array, asset: ComponentAsset): ComponentBundle {
  if (bytes.byteLength !== asset.bytes || digest(bytes) !== asset.sha256) throw new Error('The download checksum does not match. Try downloading again.');
  const bundle = JSON.parse(gunzipSync(bytes, { maxOutputLength: 160 * 1024 * 1024 }).toString('utf8')) as ComponentBundle;
  if (bundle.version !== asset.version || bundle.kind !== asset.kind || !Array.isArray(bundle.files) || !bundle.files.length || bundle.files.length > 4000) throw new Error('Invalid component package.');
  const seen = new Set<string>();
  for (const file of bundle.files) {
    if (!file || !filePath(file.path) || seen.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256) || typeof file.data !== 'string' || digest(Buffer.from(file.data, 'base64')) !== file.sha256) throw new Error('Invalid component file.');
    if (asset.kind === 'fonts' && file.path !== optionalCSS && file.path !== 'fonts/LICENSES.txt' && !/^fonts\/[a-zA-Z0-9_.-]+\.(?:woff2?|ttf|otf)$/.test(file.path)) throw new Error('Invalid font package.');
    if (asset.kind === 'core' && (file.path.startsWith('fonts/') || /\.(?:glb|otf)$/.test(file.path))) throw new Error('Unexpected optional asset in required files.');
    seen.add(file.path);
  }
  if (!seen.has(asset.kind === 'core' ? 'index.html' : optionalCSS)) throw new Error('Incomplete component package.');
  if (asset.kind === 'core' && !seen.has('obsidian-host-client.json')) throw new Error('Missing T3 client manifest.');
  return bundle;
}

async function safeDestination(root: string, relative: string): Promise<string> {
  if (!filePath(relative)) throw new Error('Invalid component path.');
  const parts = relative.split('/');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Component files cannot replace symbolic links.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return current;
}

export async function componentStatus(directory: string, asset: ComponentAsset): Promise<string | null> {
  if (!directory || !path.isAbsolute(directory)) return 'Select the absolute T3 client folder in T3 Code settings.';
  try {
    const root = await realpath(directory);
    const receipt = JSON.parse(await readFile(await safeDestination(root, receiptName(asset.kind)), 'utf8')) as Receipt;
    if (receipt.version !== asset.version || receipt.sha256 !== asset.sha256 || !Array.isArray(receipt.files) || !receipt.files.length) return 'Files belong to another version. Download them again.';
    for (const file of receipt.files) {
      if (!filePath(file.path)) return 'Invalid installation record. Download the files again.';
      const bytes = await readFile(await safeDestination(root, file.path));
      if (!(asset.kind === 'core' && file.path === optionalCSS) && digest(bytes) !== file.sha256) return 'Files are damaged or changed. Download them again.';
    }
    return null;
  } catch { return asset.kind === 'core' ? 'Required T3 files are missing. Download necessary files in T3 Code settings.' : 'Extra fonts are not installed. System fonts are used.'; }
}

export async function installComponents(directory: string, bytes: Uint8Array, asset: ComponentAsset, signal?: AbortSignal): Promise<void> {
  const bundle = decodeComponents(bytes, asset);
  if (!path.isAbsolute(directory)) throw new Error('Select an absolute T3 client folder first.');
  signal?.throwIfAborted();
  const root = await realpath(directory);
  if (!(await lstat(root)).isDirectory()) throw new Error('The T3 client folder does not exist.');
  const stage = path.join(root, '.obsidian-t3-download-' + randomUUID());
  await mkdir(stage);
  try {
    for (const file of bundle.files) {
      const destination = await safeDestination(root, file.path);
      const temporary = path.join(stage, file.path);
      await mkdir(path.dirname(temporary), { recursive: true });
      await writeFile(temporary, Buffer.from(file.data, 'base64'), { flag: 'wx' });
      await mkdir(path.dirname(destination), { recursive: true });
    }
    // Hashed assets precede the entry document, so existing tabs retain their files during an update.
    const files = [...bundle.files].sort((a, b) => Number(a.path === 'index.html' || a.path === optionalCSS) - Number(b.path === 'index.html' || b.path === optionalCSS));
    for (const file of files) {
      signal?.throwIfAborted();
      const destination = await safeDestination(root, file.path);
      if (asset.kind === 'core' && file.path === optionalCSS) {
        try { await lstat(destination); continue; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
      await rename(path.join(stage, file.path), destination);
    }
    const receipt: Receipt = { version: asset.version, sha256: asset.sha256, files: bundle.files.map(({ path, sha256 }) => ({ path, sha256 })) };
    await writeFile(path.join(stage, 'receipt.json'), JSON.stringify(receipt));
    signal?.throwIfAborted();
    await rename(path.join(stage, 'receipt.json'), await safeDestination(root, receiptName(asset.kind)));
  } finally { await rm(stage, { recursive: true, force: true }); }
}
