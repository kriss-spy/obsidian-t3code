import type { Guest } from './guest';

// Serialized into the sandboxed guest. Keep this function independent of module scope.
export function waitForUnusedEscape(): Promise<boolean> {
  const scope = window as Window & { t3ObsidianCancelEscape?: () => void };
  scope.t3ObsidianCancelEscape?.();
  return new Promise(resolve => {
    const blocked = new WeakSet<KeyboardEvent>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelPending = () => { clearTimeout(timer); };
    const finish = (release: boolean) => {
      cancelPending();
      window.removeEventListener('keydown', capture, true);
      window.removeEventListener('keydown', bubble);
      window.removeEventListener('pointerdown', cancelPending, true);
      window.removeEventListener('blur', cancelPending);
      if (scope.t3ObsidianCancelEscape === cancel) delete scope.t3ObsidianCancelEscape;
      resolve(release);
    };
    const cancel = () => finish(false);
    const capture = (event: KeyboardEvent) => {
      cancelPending();
      if (event.key !== 'Escape') return;
      // Snapshot before dismissals remove their popup. Terminal Escape belongs to the process.
      if (event.repeat || event.isComposing || event.keyCode === 229 ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          (event.target instanceof Element && event.target.closest('[data-terminal-owner], .xterm, select')) ||
          Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-popup-open]'))
            .some(element => !element.closest('[data-closed], [data-state="closed"], [data-ending-style]') &&
              element.getClientRects().length > 0)) blocked.add(event);
    };
    const bubble = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || blocked.has(event) || event.defaultPrevented) return;
      // Wait for later window listeners and React handlers before deciding the key was unused.
      timer = setTimeout(() => {
        if (!event.defaultPrevented && document.hasFocus()) finish(true);
      }, 0);
    };
    scope.t3ObsidianCancelEscape = cancel;
    window.addEventListener('keydown', capture, true);
    window.addEventListener('keydown', bubble);
    window.addEventListener('pointerdown', cancelPending, true);
    window.addEventListener('blur', cancelPending);
  });
}

export function attachEscapeFocus(guest: Guest, container: HTMLElement, current: () => boolean): () => void {
  let closed = false;
  // One pending evaluation waits for an event; no timer polls the guest for keyboard state.
  void (async () => {
    while (!closed && current()) {
      const release = await guest.executeJavaScript(`(${waitForUnusedEscape.toString()})()`);
      if (closed || !current() || release !== true) return;
      if (container.ownerDocument.activeElement === guest) {
        guest.blur();
        container.tabIndex = -1;
        container.focus({preventScroll:true});
      }
    }
  })().catch(() => { /* Navigation or removal ends the guest evaluation. */ });
  return () => {
    closed = true;
    try { void guest.executeJavaScript('window.t3ObsidianCancelEscape?.()').catch(() => {}); }
    catch { /* A removed guest cannot run cleanup. */ }
  };
}
