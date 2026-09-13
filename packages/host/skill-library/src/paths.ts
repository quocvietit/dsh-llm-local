/** Resolve and contain skill library paths under the two writable roots. */

import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { isSkillName } from '@deepseek-ai/dsh-skill'
import type { SkillLibraryLocation } from './types.ts'

/** One on-disk skill file the library may read or mutate. */
export interface SkillFileTarget {
  readonly kind: 'bundle' | 'flat'
  readonly path: string
  readonly directory: string | undefined
}

/**
 * Resolve `$DSH_HOME/skills` for user-authored skills.
 * @param env - environment mapping used by {@link resolveDshHome}.
 * @returns `$DSH_HOME/skills`.
 */
export function userSkillsRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveDshHome(undefined, env), 'skills')
}

/**
 * Resolve `<workspace>/.dsh/skills` for project-authored skills.
 * @param workspaceRoot - absolute workspace directory.
 * @returns `<workspace>/.dsh/skills`.
 */
export function projectSkillsRoot(workspaceRoot: string): string {
  return join(resolve(workspaceRoot), '.dsh', 'skills')
}

/**
 * Resolve the writable root for one location.
 * @param location - user or project root.
 * @param workspaceRoot - required for project skills.
 * @param env - environment mapping for the user root.
 * @returns the absolute writable root.
 */
export function skillsRootFor(
  location: SkillLibraryLocation,
  workspaceRoot: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (location === 'user') return userSkillsRoot(env)
  if (workspaceRoot === undefined || workspaceRoot.trim().length === 0) {
    throw new Error('project skills require a workspaceRoot')
  }
  if (!isAbsolute(workspaceRoot)) {
    throw new Error('workspaceRoot must be an absolute path')
  }
  return projectSkillsRoot(workspaceRoot)
}

/**
 * Return the contained bundle path `<root>/<name>/SKILL.md`.
 * @param root - writable skills root.
 * @param name - kebab-case skill name.
 * @returns `<root>/<name>/SKILL.md`.
 */
export function bundleSkillPath(root: string, name: string): string {
  assertSkillName(name)
  const directory = containedJoin(root, name)
  return containedJoin(directory, 'SKILL.md')
}

/**
 * Return the contained flat path `<root>/<name>.md`.
 * @param root - writable skills root.
 * @param name - kebab-case skill name.
 * @returns `<root>/<name>.md`.
 */
export function flatSkillPath(root: string, name: string): string {
  assertSkillName(name)
  return containedJoin(root, `${name}.md`)
}

/**
 * Join `segment` under `root` and reject paths that escape the root.
 * @param root - containing directory.
 * @param segment - single path segment or already-joined child.
 * @returns the resolved child path inside `root`.
 */
export function containedJoin(root: string, segment: string): string {
  const resolvedRoot = resolve(root)
  const target = resolve(resolvedRoot, segment)
  const rel = relative(resolvedRoot, target)
  if (rel.length === 0 || rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith('../') || isAbsolute(rel)) {
    throw new Error(`path escapes skill root: ${segment}`)
  }
  return target
}

function assertSkillName(name: string): void {
  if (!isSkillName(name)) {
    throw new Error(`invalid skill name "${name}"`)
  }
}
