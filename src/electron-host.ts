interface DesktopElectron {
  shell: {openExternal(url: string): Promise<void>};
  remote?: {session?: {fromPartition(partition: string): {clearStorageData(): Promise<void>;clearCache(): Promise<void>}}};
}
// Obsidian exposes Electron only at runtime. Keep this desktop compatibility boundary typed.
export function electronHost(): DesktopElectron {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('electron') as DesktopElectron;
}
