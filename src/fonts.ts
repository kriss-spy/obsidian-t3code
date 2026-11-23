import { Buffer } from 'node:buffer';

// Read resolved font stacks so user overrides and theme variables follow the same path.
export async function readObsidianFontCSS(body: HTMLElement): Promise<string> {
  const doc=body.ownerDocument, win=doc.defaultView;
  if(!win)throw Error('Obsidian window is unavailable.');
  const probe=doc.createElement('span');probe.style.display='none';body.append(probe);
  const valid=(font:string)=>font && win.CSS.supports('font-family',font) && !/[;{}<>]/.test(font);
  const read=(variable:string,fallback:string)=>{
    probe.style.fontFamily=`var(--${variable}, ${fallback})`;
    const font=win.getComputedStyle(probe).fontFamily;
    return valid(font)?font:fallback;
  };
  let ui:string,text:string,mono:string;
  const editor=doc.createElement('div');editor.className='markdown-source-view mod-cm6';editor.style.display='none';
  const scroller=editor.appendChild(doc.createElement('div'));scroller.className='cm-scroller';
  try {
    const bodyFont=win.getComputedStyle(body).fontFamily;
    ui=valid(bodyFont)?bodyFont:read('font-interface','sans-serif');mono=read('font-monospace','monospace');
    body.append(editor);scroller.append(probe);probe.className='cm-content';probe.style.fontFamily='';
    const editorFont=win.getComputedStyle(probe).fontFamily;
    text=valid(editorFont)?editorFont:read('font-text',ui);
  } finally {probe.remove();editor.remove();}
  const families=new Set([ui,text,mono].flatMap(stack=>{
    const names=(stack.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,]+/g)??[]).map(name=>name.trim().replace(/^(['"])(.*)\1$/,'$2').toLowerCase());
    // A generic family always resolves, so later faces cannot be used by this stack.
    const generic=names.findIndex(name=>/^(?:serif|sans-serif|monospace|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|system-ui|cursive|fantasy|emoji|math|fangsong)$/.test(name));
    return generic<0?names:names.slice(0,generic);
  }));
  const faces:CSSFontFaceRule[]=[];
  const visit=(rules:CSSRuleList)=>{
    for(const rule of Array.from(rules)){
      if(rule.type===win.CSSRule.FONT_FACE_RULE){
        const face=rule as CSSFontFaceRule;
        if(families.has(face.style.fontFamily.trim().replace(/^(['"])(.*)\1$/,'$2').toLowerCase()))faces.push(face);
      } else if('cssRules' in rule){
        if(rule.type===win.CSSRule.MEDIA_RULE && !win.matchMedia((rule as CSSMediaRule).conditionText).matches)continue;
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for(const sheet of Array.from(doc.styleSheets)){try{visit(sheet.cssRules);}catch{/* Cross-origin sheets can hide their rules. System font fallbacks remain available. */}}
  const embedded=await Promise.all(faces.map(async face=>{
    const source=face.style.getPropertyValue('src');
    if(!/url\(/i.test(source) && /^local\(/i.test(source))return face.cssText;
    for(const match of source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g)){
      try {
        const url=new URL(match[1]??match[2]??match[3],face.parentStyleSheet?.href??doc.baseURI);
        // Fetch in Obsidian's document, which can read its app resources and theme fonts.
        const response=await win.fetch(url.href,{signal:AbortSignal.timeout(5000)});
        if(!response.ok)continue;
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength>2*1024*1024)continue;
        const sheet=new win.CSSStyleSheet();sheet.insertRule('@font-face{}');
        const declarations=(sheet.cssRules[0] as CSSFontFaceRule).style;
        for(const property of ['font-family','font-weight','font-style','font-stretch','unicode-range']){
          const value=face.style.getPropertyValue(property);if(value)declarations.setProperty(property,value);
        }
        declarations.setProperty('src',`url("data:application/octet-stream;base64,${Buffer.from(bytes).toString('base64')}")`);
        declarations.setProperty('font-display','swap');
        return `@font-face{${declarations.cssText}}`;
      }catch{/* An unavailable face falls back through the resolved font stack. */}
    }
    return '';
  }));
  return embedded.join('\n')+`\n:root{--obsidian-font-following:1;--obsidian-font-text:${text};--font-sans:${ui}!important;--font-composer:${text}!important;--font-mono:${mono}!important}html,body{font-family:var(--font-sans)!important}.chat-markdown,[data-user-message-body]{font-family:var(--obsidian-font-text)}`;
}
