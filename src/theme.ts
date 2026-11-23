// Complete palette for the pinned T3 color contract. Colors cross the host as opaque sRGB.
export type RGB = readonly [number, number, number];
export const THEME_VARIABLES = ['background-primary','background-primary-alt','background-secondary','background-secondary-alt','background-modifier-border','background-modifier-hover','interactive-normal','interactive-hover','interactive-accent','text-normal','text-muted','text-faint','text-on-accent','text-selection','text-highlight-bg','code-background','code-normal','color-red','color-orange','color-green'] as const;
export type ThemeSource = Partial<Record<typeof THEME_VARIABLES[number], string>>;
export interface HostPalette { version: 1; name: string; appearance: 'light' | 'dark'; colors: Record<string, string> }
const rgb = (hex: string): RGB => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)) as unknown as RGB;
const hex = (c: RGB) => '#' + c.map(n => Math.round(n).toString(16).padStart(2,'0')).join('');
export function mix(a: string, b: string, amount: number): string {
  const x=rgb(a), y=rgb(b);
  return hex(x.map((n,i)=>n+(y[i]-n)*amount) as unknown as RGB);
}
function luminance(color: string) {
  const c=rgb(color).map(n=>{const s=n/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;});
  return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
}
export function contrast(a: string, b: string) {
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
export function readable(foreground: string, background: string, ratio=4.5): string {
  if(contrast(foreground,background)>=ratio)return foreground;
  const target=contrast('#000000',background)>contrast('#ffffff',background)?'#000000':'#ffffff';
  for(let i=1;i<=20;i++){const c=mix(foreground,target,i/20);if(contrast(c,background)>=ratio)return c;}
  return target;
}
export function translateTheme(source: ThemeSource, appearance: 'light'|'dark'): HostPalette {
  const value=(key: keyof ThemeSource,fallback?:string) => {
    const color=source[key] ?? fallback;
    if(!color || !/^#[a-f0-9]{6}$/i.test(color))throw Error('Cannot resolve Obsidian color: --'+key);
    return color.toLowerCase();
  };
  const canvas=value('background-primary'), text=readable(value('text-normal'),canvas);
  const accent=value('interactive-accent'), sidebar=value('background-secondary',mix(canvas,text,0.03));
  const surface=value('background-primary-alt',mix(canvas,text,0.025));
  const control=value('interactive-normal',surface), hover=value('interactive-hover',mix(control,text,0.07));
  const border=value('background-modifier-border',mix(canvas,text,0.2));
  const muted=readable(value('text-muted',mix(canvas,text,0.65)),canvas);
  const faint=readable(value('text-faint',muted),canvas);
  const accentText=readable(value('text-on-accent',text),accent);
  const selection=value('text-selection',mix(canvas,accent,0.25));
  const highlight=value('text-highlight-bg',mix(canvas,accent,0.25));
  const code=value('code-background',surface);
  const red=readable(value('color-red',appearance==='dark'?'#f87171':'#b91c1c'),canvas,3);
  const orange=readable(value('color-orange',appearance==='dark'?'#fbbf24':'#92400e'),canvas,3);
  const green=readable(value('color-green',appearance==='dark'?'#4ade80':'#166534'),canvas,3);
  const errorSurface=mix(canvas,red,0.12), warningSurface=mix(canvas,orange,0.12), updateSurface=mix(canvas,green,0.12);
  const accentSurface=mix(canvas,accent,0.12);
  return {version:1,name:'Obsidian',appearance,colors:{
    canvas,chrome:sidebar,toolbar:sidebar,toolbarForeground:readable(text,sidebar),toolbarBorder:border,
    toolbarControl:control,toolbarControlForeground:readable(text,control),toolbarControlHover:hover,
    surface,surfaceRaised:control,surfaceOverlay:surface,text,textMuted:muted,border,input:canvas,
    focus:readable(accent,canvas,3),accent,accentForeground:accentText,secondary:control,secondaryForeground:readable(text,control),
    muted:surface,mutedForeground:muted,placeholder:faint,secondaryLabel:muted,iconMuted:muted,
    error:red,errorForeground:readable(red,errorSurface),errorSurface,
    warning:orange,warningForeground:readable(orange,warningSurface),warningSurface,
    update:green,updateForeground:readable(green,updateSurface),updateSurface,
    accentSurface,accentSurfaceForeground:readable(accent,accentSurface),messageSurface:surface,messageForeground:readable(text,surface),
    messageAction:control,messageActionForeground:readable(text,control),messageActionHover:hover,
    codeBackground:code,codeForeground:readable(value('code-normal',text),code),
    searchMatchBackground:highlight,searchMatchForeground:readable(text,highlight),searchMatchActiveBackground:accent,searchMatchActiveForeground:accentText,
    sidebar,sidebarForeground:readable(text,sidebar),sidebarMutedForeground:readable(muted,sidebar),sidebarControlSurface:control,
    sidebarRowHover:value('background-modifier-hover',mix(sidebar,text,0.06)),sidebarRowActive:mix(sidebar,accent,0.12),sidebarRowSelected:mix(sidebar,accent,0.18),sidebarBorder:border,
    terminalBackground:canvas,terminalForeground:text,terminalCursor:readable(accent,canvas,3),terminalSelection:selection,
    terminalScrollbar:mix(canvas,text,0.25),terminalScrollbarHover:mix(canvas,text,0.4),
  }};
}

export function readObsidianTheme(element: HTMLElement): HostPalette {
  const doc=element.ownerDocument, win=doc.defaultView;
  if(!win)throw Error('Obsidian window is unavailable.');
  const probe=element.createEl('span'), canvas=element.createEl('canvas');
  canvas.remove();
  canvas.width=canvas.height=1;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context){probe.remove();throw Error('Color conversion is unavailable.');}
  probe.setCssStyles({display:'none'});
  const computed=win.getComputedStyle(element), source: ThemeSource={};
  try {
    for(const key of THEME_VARIABLES){
      const raw=computed.getPropertyValue('--'+key).trim();
      if(!raw)continue;
      if(!win.CSS.supports('color',raw) || /^(?:inherit|initial|unset|revert|currentcolor)$/i.test(raw))throw Error('Invalid Obsidian color: --'+key);
      probe.setCssStyles({color:''});probe.setCssStyles({color:`var(--${key})`});
      const resolved=win.getComputedStyle(probe).color;
      if(!resolved || !win.CSS.supports('color',resolved))throw Error('Invalid Obsidian color: --'+key);
      context.clearRect(0,0,1,1);context.fillStyle=resolved;context.fillRect(0,0,1,1);
      const [r,g,b,a]=context.getImageData(0,0,1,1).data;
      // Composite translucent semantic colors onto the actual canvas before crossing the parser.
      const base=source['background-primary'] ? rgb(source['background-primary']) : null;
      if(a<255 && !base)throw Error('Obsidian canvas must be opaque.');
      source[key]=hex([r,g,b].map((n,i)=>base?n*a/255+base[i]*(1-a/255):n) as unknown as RGB);
    }
    return translateTheme(source,doc.body.classList.contains('theme-dark')?'dark':'light');
  } finally {probe.remove();}
}
