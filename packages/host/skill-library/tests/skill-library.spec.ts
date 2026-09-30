import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import SkillLibraryGateway, { MAX_SKILL_BODY_BYTES } from '../src/index.ts'
import { encodeSkillMarkdown } from '../src/codec.ts'
import { bundleSkillPath, containedJoin, flatSkillPath } from '../src/paths.ts'

const contexts: Context[] = []
const homes: string[] = []
const previousHome = process.env.DSH_HOME

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(homes.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
})

async function harness(skills?: object): Promise<{
  ctx: Context
  library: SkillLibraryGateway
  home: string
  workspace: string
}> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-skill-library-'))
  homes.push(home)
  process.env.DSH_HOME = home
  const workspace = join(home, 'workspace')
  await mkdir(workspace, { recursive: true })
  const ctx = new Context()
  contexts.push(ctx)
  if (skills !== undefined) ctx.provide('skills', skills)
  await ctx.plugin(SkillLibraryGateway)
  const library = ctx.get('skillLibrary') as SkillLibraryGateway
  return { ctx, library, home, workspace }
}

const unused = new AbortController().signal

describe('SkillLibraryGateway', () => {
  it('publishes the skillLibrary namespace methods', async () => {
    const { library } = await harness()
    expect(library.typertRemote).toMatchObject({
      serviceKey: 'skillLibrary',
      namespace: 'skillLibrary',
    })
    expect(remoteMethods(library)).toEqual([
      { method: 'list', invocation: { kind: 'direct' } },
      { method: 'get', invocation: { kind: 'direct' } },
      { method: 'create', invocation: { kind: 'direct' } },
      { method: 'update', invocation: { kind: 'direct' } },
      { method: 'remove', invocation: { kind: 'direct' } },
    ])
  })

  it('creates, lists, updates, and removes a user skill bundle', async () => {
    const { library, home, ctx } = await harness()
    const changes: number[] = []
    ctx.on('skills/change', () => { changes.push(1) })

    const created = await library.create({
      name: 'draft-review',
      description: 'Review a draft',
      whenToUse: 'before sending',
      body: 'Read the draft.\n',
      location: 'user',
    }, unused)
    expect(created.editable).toBe(true)
    expect(created.location).toBe('user')
    expect(changes).toHaveLength(1)

    const listed = await library.list({}, unused)
    expect(listed.skills).toEqual([expect.objectContaining({
      name: 'draft-review',
      description: 'Review a draft',
      whenToUse: 'before sending',
      source: 'user-dsh',
      location: 'user',
      editable: true,
    })])

    const loaded = await library.get({ name: 'draft-review', location: 'user' }, unused)
    expect(loaded.body).toBe('Read the draft.')

    const markdown = await readFile(bundleSkillPath(join(home, 'skills'), 'draft-review'), 'utf8')
    expect(markdown).toContain('name: draft-review')

    await library.update({
      name: 'draft-review',
      description: 'Review a draft carefully',
      body: 'Updated body',
      location: 'user',
    }, unused)
    const updated = await library.get({ name: 'draft-review', location: 'user' }, unused)
    expect(updated.description).toBe('Review a draft carefully')
    expect(updated.body).toBe('Updated body')
    expect(changes).toHaveLength(2)

    await library.delete({ name: 'draft-review', location: 'user' }, unused)
    expect((await library.list({}, unused)).skills).toEqual([])
    expect(changes).toHaveLength(3)
  })

  it('creates a project skill under workspace/.dsh/skills', async () => {
    const { library, workspace } = await harness()
    await library.create({
      name: 'repo-check',
      description: 'Check the repo',
      body: 'Run tests.',
      location: 'project',
      workspaceRoot: workspace,
    }, unused)
    const listed = await library.list({ workspaceRoot: workspace }, unused)
    expect(listed.skills.map(skill => skill.name)).toEqual(['repo-check'])
    expect(listed.skills[0]?.location).toBe('project')
    const onDisk = await readFile(
      bundleSkillPath(join(workspace, '.dsh', 'skills'), 'repo-check'),
      'utf8',
    )
    expect(onDisk).toContain('Check the repo')
  })

  it('loads a flat Markdown skill and updates it in place', async () => {
    const { library, home } = await harness()
    const root = join(home, 'skills')
    await mkdir(root, { recursive: true })
    await writeFile(flatSkillPath(root, 'flat-note'), encodeSkillMarkdown({
      name: 'flat-note',
      description: 'A flat file',
      body: 'Hello',
    }), 'utf8')
    const loaded = await library.get({ name: 'flat-note', location: 'user' }, unused)
    expect(loaded.body).toBe('Hello')
    await library.update({
      name: 'flat-note',
      description: 'A flat file',
      body: 'Hello again',
      location: 'user',
    }, unused)
    expect(await readFile(flatSkillPath(root, 'flat-note'), 'utf8')).toContain('Hello again')
  })

  it('rejects invalid names, missing descriptions, duplicates, and oversized bodies', async () => {
    const { library } = await harness()
    await expect(library.create({
      name: 'Not Valid',
      description: 'x',
      body: 'y',
      location: 'user',
    }, unused)).rejects.toMatchObject({ code: 'gateway/bad-request' })

    await expect(library.create({
      name: 'ok-name',
      description: '   ',
      body: 'y',
      location: 'user',
    }, unused)).rejects.toMatchObject({ code: 'gateway/bad-request' })

    await library.create({
      name: 'ok-name',
      description: 'once',
      body: 'y',
      location: 'user',
    }, unused)
    await expect(library.create({
      name: 'ok-name',
      description: 'twice',
      body: 'y',
      location: 'user',
    }, unused)).rejects.toMatchObject({ code: 'gateway/bad-request' })

    const huge = 'x'.repeat(MAX_SKILL_BODY_BYTES + 1)
    await expect(library.create({
      name: 'too-big',
      description: 'huge',
      body: huge,
      location: 'user',
    }, unused)).rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('refuses project mutations without an absolute workspaceRoot', async () => {
    const { library } = await harness()
    await expect(library.create({
      name: 'no-root',
      description: 'x',
      body: 'y',
      location: 'project',
    }, unused)).rejects.toBeInstanceOf(RemoteError)
    await expect(library.create({
      name: 'rel-root',
      description: 'x',
      body: 'y',
      location: 'project',
      workspaceRoot: 'relative/path',
    }, unused)).rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('refuses to treat path-escape names as contained joins', () => {
    expect(() => containedJoin('/tmp/skills', '..')).toThrow(/escapes/)
    expect(() => containedJoin('/tmp/skills', join('..', 'etc'))).toThrow(/escapes/)
  })

  it('lists bundled registry skills as read-only and refuses to delete them', async () => {
    const { library, workspace } = await harness({
      async list() {
        return [{
          name: 'dsh-badge',
          description: 'Official badge',
          invocation: { modelInvocable: true, userInvocable: true },
          source: 'bundled',
          provider: 'dsh-badge',
        }]
      },
      async get(name: string) {
        if (name !== 'dsh-badge') return undefined
        return {
          name: 'dsh-badge',
          description: 'Official badge',
          invocation: { modelInvocable: true, userInvocable: true },
          source: 'bundled',
          provider: 'dsh-badge',
          content: 'Badge instructions',
        }
      },
    })
    const listed = await library.list({ workspaceRoot: workspace }, unused)
    expect(listed.skills).toEqual([expect.objectContaining({
      name: 'dsh-badge',
      location: 'other',
      editable: false,
      source: 'bundled',
    })])
    const loaded = await library.get({ name: 'dsh-badge', location: 'other' }, unused)
    expect(loaded.body).toBe('Badge instructions')
    await expect(library.delete({ name: 'dsh-badge', location: 'user' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('keeps registry user rows off the read-only list and loads other skills with whenToUse', async () => {
    const { library, workspace } = await harness({
      async list() {
        return [
          {
            name: 'user-skill',
            description: 'from registry',
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'user-dsh',
            provider: 'filesystem',
          },
          {
            name: 'custom-hint',
            description: 'custom',
            whenToUse: 'sometimes',
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'custom',
            provider: 'filesystem',
          },
        ]
      },
      async get(name: string) {
        if (name !== 'custom-hint') return undefined
        return {
          name: 'custom-hint',
          description: 'custom',
          whenToUse: 'sometimes',
          invocation: { modelInvocable: true, userInvocable: true },
          source: 'custom',
          provider: 'filesystem',
          content: 'Custom body',
        }
      },
    })
    await library.create({
      name: 'user-skill',
      description: 'disk',
      body: 'd',
      location: 'user',
    }, unused)
    const listed = await library.list({ workspaceRoot: workspace }, unused)
    expect(listed.skills).toEqual([
      expect.objectContaining({ name: 'user-skill', location: 'user', editable: true }),
      expect.objectContaining({ name: 'custom-hint', location: 'other', whenToUse: 'sometimes', editable: false }),
    ])
    const loaded = await library.get({ name: 'custom-hint', location: 'other', workspaceRoot: workspace }, unused)
    expect(loaded.body).toBe('Custom body')
    expect(loaded.whenToUse).toBe('sometimes')
  })

  it('returns not-found for other skills when no registry is mounted', async () => {
    const { library } = await harness()
    await expect(library.get({ name: 'dsh-badge', location: 'other' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('scans mixed roots, skips junk entries, and loads registry failures as empty extras', async () => {
    const { library, home, workspace } = await harness({
      async list() {
        throw new Error('catalog down')
      },
      async get() {
        return undefined
      },
    })
    const userRoot = join(home, 'skills')
    await mkdir(join(userRoot, '.system'), { recursive: true })
    await writeFile(join(userRoot, '.system', 'SKILL.md'), encodeSkillMarkdown({
      name: 'hidden',
      description: 'no',
      body: 'x',
    }), 'utf8')
    await mkdir(join(userRoot, 'Not A Skill'), { recursive: true })
    await mkdir(join(userRoot, 'empty-skill'), { recursive: true })
    await writeFile(join(userRoot, 'ignore.txt'), 'nope', 'utf8')
    await writeFile(join(userRoot, 'Nope.md'), encodeSkillMarkdown({
      name: 'nope',
      description: 'caps',
      body: 'x',
    }), 'utf8')
    await writeFile(join(userRoot, 'broken.md'), 'not a skill\n', 'utf8')
    await writeFile(flatSkillPath(userRoot, 'flat-ok'), encodeSkillMarkdown({
      name: 'flat-ok',
      description: 'flat',
      body: 'ok',
    }), 'utf8')
    await library.create({
      name: 'user-skill',
      description: 'user',
      body: 'u',
      location: 'user',
    }, unused)
    await library.create({
      name: 'proj-skill',
      description: 'proj',
      body: 'p',
      location: 'project',
      workspaceRoot: workspace,
    }, unused)
    const listed = await library.list({ workspaceRoot: workspace }, unused)
    expect(listed.skills.map(skill => `${skill.location}:${skill.name}`)).toEqual([
      'user:flat-ok',
      'user:user-skill',
      'project:proj-skill',
    ])
    await expect(library.get({ name: 'missing', location: 'user' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
    await expect(library.get({ name: 'dsh-badge', location: 'other' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
    await expect(library.update({
      name: 'missing',
      description: 'x',
      body: 'y',
      location: 'user',
    }, unused)).rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('removes a flat skill and refuses unparsable bodies on get', async () => {
    const { library, home } = await harness()
    const root = join(home, 'skills')
    await mkdir(root, { recursive: true })
    await writeFile(flatSkillPath(root, 'flat-note'), encodeSkillMarkdown({
      name: 'flat-note',
      description: 'A flat file',
      body: 'Hello',
    }), 'utf8')
    await library.delete({ name: 'flat-note', location: 'user' }, unused)
    expect((await library.list({}, unused)).skills).toEqual([])
    const bundleDir = join(root, 'bad-parse')
    await mkdir(bundleDir, { recursive: true })
    await writeFile(join(bundleDir, 'SKILL.md'), '---\nname: bad-parse\n---\n', 'utf8')
    await expect(library.get({ name: 'bad-parse', location: 'user' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('surfaces a non-Error root failure as a bad request', async () => {
    const { library } = await harness()
    await expect(library.list({ workspaceRoot: 'relative' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
    expect((await library.list({ workspaceRoot: '   ' }, unused)).skills).toEqual([])
  })

  it('skips duplicate registry rows and loads a project skill', async () => {
    const { library, workspace } = await harness({
      async list() {
        return [
          {
            name: 'hint',
            description: 'one',
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'bundled',
            provider: 'a',
          },
          {
            name: 'hint',
            description: 'two',
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'custom',
            provider: 'b',
          },
          {
            name: 'disk-skill',
            description: 'project registry',
            invocation: { modelInvocable: true, userInvocable: true },
            source: 'project-dsh',
            provider: 'filesystem',
          },
        ]
      },
      async get() {
        return undefined
      },
    })
    await library.create({
      name: 'alpha-skill',
      description: 'a',
      body: 'a',
      location: 'user',
    }, unused)
    await library.create({
      name: 'zeta-skill',
      description: 'z',
      body: 'z',
      location: 'user',
    }, unused)
    await library.create({
      name: 'proj-skill',
      description: 'p',
      whenToUse: '',
      body: 'p',
      location: 'project',
      workspaceRoot: workspace,
    }, unused)
    const listed = await library.list({ workspaceRoot: workspace }, unused)
    expect(listed.skills.filter(skill => skill.name === 'hint')).toHaveLength(1)
    expect((await library.list({}, unused)).skills.map(skill => skill.name)).toEqual([
      'alpha-skill',
      'zeta-skill',
      'hint',
    ])
    expect(listed.skills.map(skill => `${skill.location}:${skill.name}`)).toEqual([
      'user:alpha-skill',
      'user:zeta-skill',
      'project:proj-skill',
      'other:hint',
    ])
    const loaded = await library.get({
      name: 'proj-skill',
      location: 'project',
      workspaceRoot: workspace,
    }, unused)
    expect(loaded.body).toBe('p')
    expect(loaded.whenToUse).toBeUndefined()
    await expect(library.get({ name: 'Not Valid', location: 'user' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
    await expect(library.delete({ name: 'missing', location: 'user' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
  })

  it('treats a directory SKILL.md as missing on get and throws when the skills root is a file', async () => {
    const { library, home } = await harness()
    const root = join(home, 'skills')
    await mkdir(join(root, 'dir-body', 'SKILL.md'), { recursive: true })
    await expect(library.get({ name: 'dir-body', location: 'user' }, unused))
      .rejects.toMatchObject({ code: 'gateway/bad-request' })
    await expect(library.list({}, unused)).rejects.toBeDefined()
    await rm(root, { recursive: true, force: true })
    await writeFile(root, 'not-a-directory', 'utf8')
    await expect(library.list({}, unused)).rejects.toBeDefined()
  })
})
