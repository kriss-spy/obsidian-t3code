import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';

export interface Project { id: string; environmentId: string; workspaceRoot: string }
export interface Thread { projectId: string; environmentId: string; worktreePath?: string | null }
export type ScopeDecision = { included: true; directory: string } | { included: false; reason: string };
export type CanonicalDirectory = (directory: string) => string;

export function canonicalDirectory(directory: string): string {
  if (!path.isAbsolute(directory)) throw new Error('Directory is not absolute.');
  const resolved = realpathSync.native(directory);
  if (!statSync(resolved).isDirectory()) throw new Error('Path is not a directory.');
  return resolved;
}

export function containsDirectory(root: string, candidate: string, rules = path): boolean {
  if (!rules.isAbsolute(root) || !rules.isAbsolute(candidate)) return false;
  const relative = rules.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + rules.sep) && !rules.isAbsolute(relative));
}

export function threadScope(
  vaultRoot: string, localEnvironmentId: string, thread: Thread,
  project: Project | undefined, resolve: CanonicalDirectory = canonicalDirectory,
): ScopeDecision {
  if (!localEnvironmentId) return { included: false, reason: 'Local environment identity unavailable.' };
  if (!project || project.id !== thread.projectId) return { included: false, reason: 'Project metadata unavailable.' };
  if (thread.environmentId !== localEnvironmentId || project.environmentId !== localEnvironmentId) {
    return { included: false, reason: 'Environment is not verified local.' };
  }
  // An empty worktree path is invalid metadata, not a reason to widen to the project.
  const directory = thread.worktreePath ?? project.workspaceRoot;
  try {
    const root = resolve(vaultRoot);
    const resolved = resolve(directory);
    return containsDirectory(root, resolved)
      ? { included: true, directory: resolved }
      : { included: false, reason: 'Working directory is outside this vault.' };
  } catch { return { included: false, reason: 'Cannot resolve working directory identity.' }; }
}
