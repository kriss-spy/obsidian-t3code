const fs = require('fs');
const os = require('os');
const path = require('path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'obsidian-t3-files-'));
const cases = [];
const leaves = [];
try {
  for (const name of ['plain.md', 'space name.md', '中文笔记.md', 'hash # note.md']) {
    const absolute = path.join(directory, name);
    fs.writeFileSync(absolute, '# Temporary integration fixture\n\nLine three\n');
    const file = app.vault.getFileByPath('file:' + absolute);
    if (!file) throw new Error('External file lookup failed: ' + name);
    const leaf = app.workspace.getLeaf('tab');
    leaves.push(leaf);
    await leaf.openFile(file, { active: true, state: { mode: 'source' } });
    await new Promise(resolve => setTimeout(resolve, 100));
    const editor = leaf.view.editor;
    if (!editor) throw new Error('No Markdown editor: ' + name);
    editor.setCursor({ line: 2, ch: 0 });
    editor.replaceRange('Edited in Obsidian: ', { line: 2, ch: 0 });
    await new Promise(resolve => setTimeout(resolve, 350));
    await leaf.view.save();
    for (let attempt = 0; attempt < 20 && !fs.readFileSync(absolute, 'utf8').includes('Edited in Obsidian: Line three'); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    cases.push({ name, type: leaf.view.getViewType(), originalFileSaved: fs.readFileSync(absolute, 'utf8').includes('Edited in Obsidian: Line three'), line: editor.getCursor().line, editor:editor.getValue(), viewData:leaf.view.getViewData(), disk:fs.readFileSync(absolute,'utf8') });
  }
  return JSON.stringify({ directory, cases });
} finally {
  for (const leaf of leaves) leaf.detach();
  fs.rmSync(directory, { recursive: true, force: true });
}
