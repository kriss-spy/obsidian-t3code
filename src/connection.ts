import { createHash } from 'node:crypto';

export interface Descriptor {
  environmentId: string;
  serverVersion: string;
  orchestrationProtocolVersion: number;
  capabilities: Record<string, unknown>;
}

// Accept origins only. Pairing URLs and credentials must never enter plugin JSON.
export function serverOrigin(input: string): string {
  const url = new URL(input);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Enter a server origin without credentials, path, query, or fragment.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('Use HTTPS, or HTTP on loopback through a secure tunnel.');
  }
  return url.origin;
}

export function parseDescriptor(value: unknown): Descriptor {
  if (!value || typeof value !== 'object') throw new Error('Invalid server descriptor.');
  const d = value as Partial<Descriptor>;
  if (typeof d.environmentId !== 'string' || !d.environmentId || d.environmentId.length > 200 ||
      typeof d.serverVersion !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(d.serverVersion) ||
      !Number.isSafeInteger(d.orchestrationProtocolVersion) ||
      !d.capabilities || typeof d.capabilities !== 'object' || Array.isArray(d.capabilities)) {
    throw new Error('Invalid server descriptor.');
  }
  return d as Descriptor;
}

export function partitionFor(vaultRoot: string, origin: string): string {
  return 'persist:obsidian-t3-code-' + createHash('sha256').update(vaultRoot + '\0' + origin).digest('hex');
}

export interface Compatibility { supported: boolean; message: string }
export function compatibility(d: Descriptor): Compatibility {
  // No build is approved yet. A server's self-declared flag alone cannot pass the
  // real-chip and strict pre-render acceptance gate. Add exact builds only after it passes.
  return {
    supported: false,
    message: `T3 ${d.serverVersion}, protocol ${d.orchestrationProtocolVersion}: no verified strict-scope host adapter. Guest not mounted.`,
  };
}

export function savedTarget(value: unknown, origin: string): string {
  // Persist only a conservative route path. Never retain pairing links or queries.
  if (typeof value !== 'string') return '/';
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash) return '/';
    return /^\/(?:thread\/[a-zA-Z0-9_-]+)?$/.test(url.pathname) ? url.pathname : '/';
  } catch { return '/'; }
}
