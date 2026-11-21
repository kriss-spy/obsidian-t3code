# Test the Linux candidate

Use the rc.2 package's matching plugin and web client. The menu change is in the web client; replacing only `main.js` does not update it. Start with disposable or backed-up test notes. Keep T3's normal UI available for comparison.

1. Open a Markdown preview's editor menu. Expect **Obsidian** with a gem icon. Select it. Check the original note and requested line. Check the explorer's **Open with** submenu too. A normal Markdown chip click should retain T3's preview.
2. Type an unsent draft and add an attachment. Immediately close and reopen the T3 tab. Disable and enable the plugin. Expect the same target, text, and attachment state. Nothing should send automatically.
3. Physically drag a note, then a folder, from Obsidian's explorer to the composer. Expect references in the intended draft. Existing text and attachments must remain. Moving to another thread during the drag must not insert into that thread.
4. Search an alias such as `蔚蓝档案`. Check the first highlight and press Enter. Edit the alias or rename the note, then search again. Expect the current canonical note without duplicates.
5. Run a real task on test files. Check streaming and tool output. Answer any question and permission request. Stop a running task, reconnect, then continue. Expect one submission and one continuation, with no duplicated work.
6. Compare session lists, search, recents, and archive with normal T3. Expect only threads rooted in this vault or its subfolders. Test at least one pinned, snoozed, settled, and archived thread.
7. Use the terminal, browser preview, and a diff during normal work. Resize the pane and change themes. Check input, focus, clipboard behavior, scrolling, and readable controls. Report pauses when typing in a large draft.

Start with steps 1–3 and 5. They provide the most useful manual evidence now. The remaining [stable release gates](release-readiness.md) are still open.

For a failure, report the step, what you did, what you expected, and what happened. Include a screenshot or short recording when useful. Also report whether the same action works in normal T3. A pass means you performed that action; untested steps remain unverified.
