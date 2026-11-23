import path from 'node:path';

export interface DraftLink { link: string; original: string; position: {start:{offset:number};end:{offset:number}} }
export interface DraftHeading { heading: string; level: number; position: {start:{line:number}} }
export interface DraftDestination { path: string; headings?: DraftHeading[]; lines: number }
export function externalDraftLink(link: DraftLink): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link.link) && !/^[A-Za-z]:[\\/]/.test(link.link);
}
export function draftLinkParts(link: DraftLink) {
  const wiki = /^!?\[\[/.test(link.original), hash = link.link.indexOf('#');
  const pathname = hash < 0 ? link.link : link.link.slice(0,hash);
  const heading = hash < 0 ? '' : link.link.slice(hash+1);
  if (wiki) return {wiki,pathname,heading};
  try {return {wiki,pathname:decodeURIComponent(pathname),heading:decodeURIComponent(heading)};}
  catch {throw new Error('Invalid link: ' + link.original);}
}
export const lineReference = (heading: string) => /^L\d+(?:C\d+|-L?\d+)?$/i.test(heading);
const headingKey = (value: string) => value.trim().replace(/\s+/g,' ').toLowerCase();
const slug = (value: string) => headingKey(value).replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
const encodePath = (value: string) => value.replace(/\\/g,'/').split('/').map((part,index) => index === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)).join('/');

// T3 recognizes a file mention only when its label equals the decoded destination basename.
export function formatDraftLinks(text: string, links: DraftLink[], vaultRoot: string, cwd: string,
  resolve: (linkpath: string) => DraftDestination): string {
  let result = text;
  for (const link of [...links].sort((a,b) => b.position.start.offset - a.position.start.offset)) {
    const {offset:start} = link.position.start, {offset:end} = link.position.end;
    if (text.slice(start,end) !== link.original) throw new Error('Draft link metadata changed. Try returning the draft again.');
    if (externalDraftLink(link)) continue;
    const {wiki,pathname,heading} = draftLinkParts(link);
    if (!pathname) throw new Error('Link to the temporary draft cannot be returned: ' + link.original);
    let target = pathname, fragment = heading ? '#' + heading : '';
    let href = link.link.replace(/[\s()<>]/g,char => encodeURIComponent(char));
    if (wiki || (heading && !lineReference(heading))) {
      const destination = resolve(pathname);
      if (wiki) target = path.relative(cwd,path.join(vaultRoot,destination.path)).split(path.sep).join('/');
      if (heading && !lineReference(heading)) {
        if (heading.startsWith('^')) throw new Error('Block references are not supported: ' + link.original);
        const headings = destination.headings ?? [];
        const matches = headings.filter(h => headingKey(h.heading) === headingKey(heading) || slug(h.heading) === headingKey(heading));
        if (matches.length !== 1) throw new Error('Heading is missing or ambiguous: ' + link.original);
        const selected = matches[0], index = headings.indexOf(selected);
        const next = headings.slice(index+1).find(h => h.level <= selected.level);
        const from = selected.position.start.line+1, to = next ? next.position.start.line : destination.lines;
        fragment = `#L${from}-L${Math.max(from,to)}`;
      }
      const authoredPath = link.link.split('#')[0].replace(/[\s()<>]/g,char => encodeURIComponent(char));
      href = (wiki ? encodePath(target) : authoredPath) + fragment;
    }
    if (lineReference(fragment.slice(1))) {
      const match = fragment.match(/^#L(\d+)(?:C(\d+)|-L?(\d+))?$/i)!;
      fragment = ':' + match[1] + (match[2] ? ':' + match[2] : match[3] ? '-' + match[3] : '');
      const prefix = !/[\\/]/.test(target) ? './' : '';
      const authoredPath = link.link.split('#')[0].replace(/[\s()<>]/g,char => encodeURIComponent(char));
      href = (wiki ? encodePath(prefix + target) : prefix + authoredPath) + fragment;
    }
    const filename = target.replace(/\\/g,'/').split('/').at(-1)!;
    const label = (filename + fragment).replace(/[\\[\]*_]/g,'\\$&');
    const before = start > 0 && !/\s/.test(result[start-1]) ? ' ' : '';
    const after = !/\s/.test(result[end] ?? '') ? ' ' : '';
    result = result.slice(0,start) + before + `[${label}](${href})` + after + result.slice(end);
  }
  return result;
}
