import { APPROVED_CLIENT } from './approved-client';
import { verifyClientIntegrity } from './client-integrity';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Descriptor } from './connection';
import { serverOrigin, compatibility, type Compatibility } from './connection';
import { T3_REVISION, ADAPTER_BUILD } from './host-contract';
export { ADAPTER_BUILD } from './host-contract';
export interface VerifiedLocalServer {readonly origin:string; readonly environmentId:string; readonly build:string; readonly clientManifestSha256?:string}
const verifiedSessions = new WeakSet<object>();
// Populate only after the pinned patch passes the strict scope and real-chip gate.
export function verifiedCompatibility(descriptor: Descriptor, origin: string, proof: VerifiedLocalServer): Compatibility {
  if (verifiedSessions.has(proof) && proof.origin === origin && proof.environmentId === descriptor.environmentId && APPROVED_CLIENT?.build === proof.build && proof.clientManifestSha256 === APPROVED_CLIENT.manifestSha256 && descriptor.serverVersion === '0.1.11' && descriptor.orchestrationProtocolVersion === 2 && process.platform === 'linux') {
    return {supported:true,message:`T3 ${descriptor.serverVersion}: verified local host adapter ${proof.build}.`};
  }
  return compatibility(descriptor);
}
export async function verifyLocalServer(
  origin: string, descriptor: Descriptor, configDirectory: string,
  request: (url: string) => Promise<unknown>,
  fetchBytes?: (url:string) => Promise<ArrayBuffer>,
): Promise<VerifiedLocalServer> {
  if (process.platform !== 'linux') throw new Error('This development adapter supports Linux only.');
  const machine = (await readFile('/etc/machine-id','utf8')).trim();
  if (!/^[a-f0-9]{32}$/i.test(machine)) throw new Error('Local machine identity is unavailable.');
  const file = path.join(configDirectory, 't3-code-host-' + randomUUID());
  const token = randomBytes(32).toString('hex');
  const machineProof = createHmac('sha256', token).update('machine:' + machine).digest('hex');
  await writeFile(file, token, {mode:0o600, flag:'wx'});
  try {
    const value = await request(serverOrigin(origin) + '/.well-known/t3/obsidian-host?challenge=' + encodeURIComponent(file));
    if (!value || typeof value !== 'object') throw new Error('Local server proof unavailable.');
    const proof = value as Record<string, unknown>;
    const expected = createHash('sha256').update(token + ':' + descriptor.environmentId).digest('hex');
    if (proof.adapterBuild !== ADAPTER_BUILD || proof.revision !== T3_REVISION || proof.environmentId !== descriptor.environmentId || proof.proof !== expected || proof.machineProof !== machineProof) {
      throw new Error('The T3 server did not prove the expected local filesystem and adapter build.');
    }
    const clientManifestSha256 = fetchBytes ? await verifyClientIntegrity(serverOrigin(origin), await request(serverOrigin(origin)+'/obsidian-host-client.json'), fetchBytes) : undefined;
    const result = Object.freeze({origin:serverOrigin(origin), environmentId:descriptor.environmentId, build:ADAPTER_BUILD,clientManifestSha256});
    verifiedSessions.add(result);
    return result;
  } finally { await unlink(file); }
}
