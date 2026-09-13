/**
 * Host Remote for listing and mutating user and project skill files.
 *
 * @module @deepseek-ai/dsh-host-skill-library
 */

import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { isSkillName, type SkillDefinition, type SkillSummary } from '@deepseek-ai/dsh-skill'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from 'zod'
import {
  encodeSkillMarkdown, parseSkillMarkdown, skillBodyExceedsLimit, type ParsedSkillFile,
} from './codec.ts'
import {
  bundleSkillPath,
  containedJoin,
  flatSkillPath,
  skillsRootFor,
  type SkillFileTarget,
} from './paths.ts'
import type {
  SkillLibraryEntry,
  SkillLibraryEntryLocation,
  SkillLibraryGetRequest,
  SkillLibraryListRequest,
  SkillLibraryListValue,
  SkillLibraryLocation,
  SkillLibraryRecord,
  SkillLibraryRemoveRequest,
  SkillLibraryWriteRequest,
} from './types.ts'

export type * from './types.ts'
export { MAX_SKILL_BODY_BYTES } from './codec.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `skillLibrary` Remote namespace. */
    skillLibrary: SkillLibraryGateway
  }
}

interface SkillRegistryFace {
  list(options?: { cwd?: string }): Promise<readonly SkillSummary[]>
  get(name: string, options?: { cwd?: string }): Promise<SkillDefinition | undefined>
}

/** Remote service for the Settings skill library. */
export class SkillLibraryGateway extends TypertRemoteService {
  static inject = []

  /**
   * @param ctx - Host context; `ctx.skills` is optional and supplies read-only catalog rows.
   */
  constructor(ctx: Context) {
    super(ctx, 'skillLibrary')
  }

  /**
   * List editable skills from the user and project roots, plus read-only registry skills.
   * @param request - optional project workspace used to scan `.dsh/skills`.
   * @param signal - caller lifetime; listing does not abort in-flight disk reads.
   * @returns editable disk rows plus read-only registry rows.
   */
  @Remote
  async list(request: SkillLibraryListRequest, signal: AbortSignal): Promise<SkillLibraryListValue> {
    void signal
    const editable = await this.listEditable(request.workspaceRoot)
    const seen = new Set(editable.map(skill => `${skill.location}:${skill.name}`))
    const readonlySkills = await this.listReadonly(request.workspaceRoot, seen)
    const skills = [...editable, ...readonlySkills].sort(compareEntries)
    return { skills }
  }

  /**
   * Load one skill body for the editor.
   * @param request - name, location, and optional project workspace.
   * @param signal - caller lifetime; unused by the disk read.
   * @returns the catalog row plus Markdown body.
   */
  @Remote
  async get(request: SkillLibraryGetRequest, signal: AbortSignal): Promise<SkillLibraryRecord> {
    void signal
    this.assertName(request.name)
    if (request.location === 'other') {
      return await this.getReadonly(request.name, request.workspaceRoot)
    }
    const root = this.rootOrThrow(request.location, request.workspaceRoot)
    const target = await this.findSkillFile(root, request.name)
    if (target === undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${request.name}" was not found`, {})
    }
    const parsed = await this.readParsed(target.path)
    if (parsed === undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${request.name}" could not be parsed`, {})
    }
    return {
      ...this.entryFromParsed(parsed, request.location === 'user' ? 'user-dsh' : 'project-dsh', request.location, true),
      body: parsed.body,
    }
  }

  /**
   * Create a directory-bundle skill under a writable root.
   * @param request - name, description, body, and target location.
   * @param signal - caller lifetime; unused by the disk write.
   * @returns the created skill record.
   */
  @Remote
  async create(request: SkillLibraryWriteRequest, signal: AbortSignal): Promise<SkillLibraryRecord> {
    void signal
    this.assertWritablePayload(request)
    const root = this.rootOrThrow(request.location, request.workspaceRoot)
    if (await this.findSkillFile(root, request.name) !== undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${request.name}" already exists`, {})
    }
    const path = bundleSkillPath(root, request.name)
    const directory = containedJoin(root, request.name)
    await mkdir(directory, { recursive: true })
    const markdown = encodeSkillMarkdown(request)
    await writeFile(path, markdown, 'utf8')
    this.announceChange()
    return this.recordFromWrite(request)
  }

  /**
   * Replace the Markdown of an existing writable skill.
   * @param request - name, description, body, and target location.
   * @param signal - caller lifetime; unused by the disk write.
   * @returns the updated skill record.
   */
  @Remote
  async update(request: SkillLibraryWriteRequest, signal: AbortSignal): Promise<SkillLibraryRecord> {
    void signal
    this.assertWritablePayload(request)
    const root = this.rootOrThrow(request.location, request.workspaceRoot)
    const target = await this.findSkillFile(root, request.name)
    if (target === undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${request.name}" was not found`, {})
    }
    const markdown = encodeSkillMarkdown(request)
    await writeFile(target.path, markdown, 'utf8')
    this.announceChange()
    return this.recordFromWrite(request)
  }

  /**
   * Delete one writable skill file or bundle directory.
   * @param request - name and location of the skill to remove.
   * @param signal - caller lifetime; unused by the disk delete.
   */
  @Remote
  async delete(request: SkillLibraryRemoveRequest, signal: AbortSignal): Promise<void> {
    void signal
    this.assertName(request.name)
    const root = this.rootOrThrow(request.location, request.workspaceRoot)
    const target = await this.findSkillFile(root, request.name)
    if (target === undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${request.name}" was not found`, {})
    }
    if (target.kind === 'bundle' && target.directory !== undefined) {
      await rm(target.directory, { recursive: true, force: true })
    } else {
      await rm(target.path, { force: true })
    }
    this.announceChange()
  }

  private announceChange(): void {
    this.ctx.emit('skills/change')
  }

  private assertName(name: string): void {
    if (!isSkillName(name)) {
      throw new RemoteError('gateway/bad-request', `invalid skill name "${name}"`, {})
    }
  }

  private assertWritablePayload(request: SkillLibraryWriteRequest): void {
    this.assertName(request.name)
    if (request.description.trim().length === 0) {
      throw new RemoteError('gateway/bad-request', 'skill description is required', {})
    }
    if (skillBodyExceedsLimit(request.body)) {
      throw new RemoteError('gateway/bad-request', 'skill body exceeds the 256KiB limit', {})
    }
  }

  private rootOrThrow(location: SkillLibraryLocation, workspaceRoot: string | undefined): string {
    try {
      return skillsRootFor(location, workspaceRoot)
    } catch (error: unknown) {
      /* v8 ignore next -- skillsRootFor throws Error */
      throw new RemoteError('gateway/bad-request', error instanceof Error ? error.message : String(error), {})
    }
  }

  private recordFromWrite(request: SkillLibraryWriteRequest): SkillLibraryRecord {
    return {
      name: request.name,
      description: request.description,
      ...request.whenToUse === undefined || request.whenToUse.length === 0 ? {} : { whenToUse: request.whenToUse },
      source: request.location === 'user' ? 'user-dsh' : 'project-dsh',
      location: request.location,
      editable: true,
      body: request.body.replace(/\s+$/u, ''),
    }
  }

  private entryFromParsed(
    parsed: { name: string; description: string; whenToUse?: string },
    source: string,
    location: SkillLibraryEntryLocation,
    editable: boolean,
  ): SkillLibraryEntry {
    return {
      name: parsed.name,
      description: parsed.description,
      ...parsed.whenToUse === undefined ? {} : { whenToUse: parsed.whenToUse },
      source,
      location,
      editable,
    }
  }

  private async listEditable(workspaceRoot: string | undefined): Promise<SkillLibraryEntry[]> {
    const user = await this.scanRoot(this.rootOrThrow('user', undefined), 'user', 'user-dsh')
    if (workspaceRoot === undefined || workspaceRoot.trim().length === 0) return user
    const project = await this.scanRoot(this.rootOrThrow('project', workspaceRoot), 'project', 'project-dsh')
    return [...user, ...project]
  }

  private async listReadonly(
    workspaceRoot: string | undefined,
    seen: Set<string>,
  ): Promise<SkillLibraryEntry[]> {
    const registry = this.ctx.get('skills') as SkillRegistryFace | undefined
    if (registry === undefined) return []
    try {
      const summaries = await registry.list(
        workspaceRoot === undefined ? undefined : { cwd: workspaceRoot },
      )
      const extra: SkillLibraryEntry[] = []
      for (const skill of summaries) {
        const location = locationOfSource(skill.source)
        if (location !== 'other') continue
        const key = `${location}:${skill.name}`
        if (seen.has(key)) continue
        seen.add(key)
        extra.push({
          name: skill.name,
          description: skill.description,
          ...skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse },
          source: skill.source,
          location,
          editable: false,
        })
      }
      return extra
    } catch {
      return []
    }
  }

  private async getReadonly(name: string, workspaceRoot: string | undefined): Promise<SkillLibraryRecord> {
    const registry = this.ctx.get('skills') as SkillRegistryFace | undefined
    if (registry === undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${name}" was not found`, {})
    }
    const loaded = await registry.get(
      name,
      workspaceRoot === undefined ? undefined : { cwd: workspaceRoot },
    )
    if (loaded === undefined) {
      throw new RemoteError('gateway/bad-request', `skill "${name}" was not found`, {})
    }
    return {
      name: loaded.name,
      description: loaded.description,
      ...loaded.whenToUse === undefined ? {} : { whenToUse: loaded.whenToUse },
      source: loaded.source,
      location: 'other',
      editable: false,
      body: loaded.content,
    }
  }

  private async scanRoot(
    root: string,
    location: SkillLibraryLocation,
    source: string,
  ): Promise<SkillLibraryEntry[]> {
    let entries
    try {
      entries = await readdir(root, { withFileTypes: true })
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
    const skills: SkillLibraryEntry[] = []
    for (const entry of entries) {
      if (entry.name === '.system') continue
      if (entry.isDirectory()) {
        if (!isSkillName(entry.name)) continue
        const path = bundleSkillPath(root, entry.name)
        const parsed = await this.readParsed(path)
        if (parsed === undefined) continue
        skills.push(this.entryFromParsed(parsed, source, location, true))
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const name = entry.name.slice(0, -'.md'.length)
      if (!isSkillName(name)) continue
      const path = flatSkillPath(root, name)
      const parsed = await this.readParsed(path)
      if (parsed === undefined) continue
      skills.push(this.entryFromParsed(parsed, source, location, true))
    }
    return skills
  }

  private async findSkillFile(root: string, name: string): Promise<SkillFileTarget | undefined> {
    const bundle = bundleSkillPath(root, name)
    if (await isFile(bundle)) {
      return { kind: 'bundle', path: bundle, directory: containedJoin(root, name) }
    }
    const flat = flatSkillPath(root, name)
    if (await isFile(flat)) {
      return { kind: 'flat', path: flat, directory: undefined }
    }
    return undefined
  }

  private async readParsed(path: string): Promise<ParsedSkillFile | undefined> {
    let raw: string
    try {
      raw = await readFile(path, 'utf8')
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
    return parseSkillMarkdown(raw)
  }
}

function locationOfSource(source: string): SkillLibraryEntryLocation {
  if (source === 'user-dsh') return 'user'
  if (source === 'project-dsh') return 'project'
  return 'other'
}

function compareEntries(left: SkillLibraryEntry, right: SkillLibraryEntry): number {
  const order = { user: 0, project: 1, other: 2 } as const
  const byLocation = order[left.location] - order[right.location]
  if (byLocation !== 0) return byLocation
  return left.name.localeCompare(right.name)
}

async function isFile(path: string): Promise<boolean> {
  try {
    const info = await stat(path)
    return info.isFile()
  } catch {
    // Missing or unreadable paths are not skill files the library can open.
    return false
  }
}

export default SkillLibraryGateway
