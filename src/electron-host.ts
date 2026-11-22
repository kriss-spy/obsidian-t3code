export interface ProtocolRequest { url: string; method: string; headers: Record<string,string>; uploadData?: Array<{bytes?: Uint8Array; blobUUID?: string; file?: string}> }
export interface ProtocolResponse { data: Buffer; statusCode?: number; mimeType?: string; headers?: Record<string,string|string[]> }
export interface DesktopSession {
  getBlobData?(identifier:string):Promise<Buffer>;
  clearStorageData(): Promise<void>;
  clearCache(): Promise<void>;
  protocol?: {
    interceptBufferProtocol(scheme:string,handler:(request:ProtocolRequest,done:(response:ProtocolResponse)=>void)=>void): boolean | void;
    uninterceptProtocol(scheme:string): Promise<void> | void;
  };
  fetch(url:string,init?:{method?:string;headers?:Record<string,string>;body?:Buffer;bypassCustomProtocolHandlers?:boolean;redirect?:'manual'}):Promise<Response>;
}
interface DesktopElectron {
  shell: {openExternal(url: string): Promise<void>};
  remote?: {session?: {fromPartition(partition: string): DesktopSession}};
}
// Obsidian exposes Electron only at runtime. Keep this desktop compatibility boundary typed.
export function electronHost(): DesktopElectron {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Electron is provided by the desktop host at runtime.
  return require('electron') as DesktopElectron;
}
