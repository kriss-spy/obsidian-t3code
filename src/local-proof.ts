import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
export async function verifySharedFilesystem(configDirectory: string, readProof: (file: string) => Promise<unknown>): Promise<void> {
  if (process.platform !== 'linux') throw new Error('This release supports local Linux T3 servers only.');
  const machine = (await readFile('/etc/machine-id','utf8')).trim();
  if (!/^[a-f0-9]{32}$/i.test(machine)) throw new Error('Local machine identity is unavailable.');
  const file = path.join(configDirectory,'t3-code-host-'+randomUUID());
  const token = randomBytes(32).toString('hex');
  await writeFile(file,token,{mode:0o600,flag:'wx'});
  try {
    const response = await readProof(file) as {token?:unknown;machine?:unknown} | null;
    if (!response || response.token !== token || response.machine !== machine) throw new Error('T3 could not verify this vault on the same computer. Native integration remains disabled.');
  } finally { await unlink(file); }
}
