import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
export async function verifySharedFilesystem(configDirectory: string, readProof: (file: string, machineFile?: string) => Promise<unknown>): Promise<void> {
  if (process.platform !== 'linux' && process.platform !== 'win32') throw new Error('Local vault verification supports Windows and Linux hosts.');
  // A second, short-lived challenge outside the vault proves access to the Windows
  // host as well as the vault. A server with only a mounted vault cannot answer it.
  const machineFile = process.platform === 'win32' ? path.join(tmpdir(),'t3-code-machine-'+randomUUID()) : undefined;
  const machine = machineFile ? randomBytes(32).toString('hex') : (await readFile('/etc/machine-id','utf8')).trim();
  if (!machineFile && !/^[a-f0-9]{32}$/i.test(machine)) throw new Error('Local machine identity is unavailable.');
  const file = path.join(configDirectory,'t3-code-host-'+randomUUID());
  const token = randomBytes(32).toString('hex');
  if (machineFile) await writeFile(machineFile,machine,{mode:0o600,flag:'wx'});
  try {
    await writeFile(file,token,{mode:0o600,flag:'wx'});
    try {
      const response = await readProof(file, machineFile) as {token?:unknown;machine?:unknown} | null;
      if (!response || response.token !== token || response.machine !== machine) throw new Error('T3 could not verify this vault on the same computer. Native integration remains disabled.');
    } finally { await unlink(file); }
  } finally { if (machineFile) await unlink(machineFile); }
}
