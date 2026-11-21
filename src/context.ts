import type { Editor } from 'obsidian';
export interface EditorContext { source: string; markdown: string; lines?: {from:number; to:number} }
export function captureContext(editor: Editor, source: string, selection: boolean): EditorContext {
  const markdown = selection ? editor.getSelection() : editor.getValue();
  if (selection && !markdown) throw new Error('Select text before adding it to T3.');
  if (!selection) return {source, markdown};
  const from = editor.getCursor('from'), to = editor.getCursor('to');
  return {source, markdown, lines:{from:from.line + 1, to:to.ch === 0 && to.line > from.line ? to.line : to.line + 1}};
}
export function encodeContext(context: EditorContext): string {
  return 'Context from Obsidian\n\n```json\n' + JSON.stringify(context, null, 2) + '\n```';
}
