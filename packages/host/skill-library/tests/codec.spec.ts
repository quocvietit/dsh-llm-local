import { describe, expect, it } from 'vitest'
import { encodeSkillMarkdown, parseSkillMarkdown, skillBodyExceedsLimit, MAX_SKILL_BODY_BYTES } from '../src/codec.ts'
import { bundleSkillPath, containedJoin, userSkillsRoot } from '../src/paths.ts'

describe('skill library codec', () => {
  it('round-trips optional whenToUse and rejects malformed frontmatter', () => {
    const encoded = encodeSkillMarkdown({
      name: 'ok-name',
      description: 'desc',
      whenToUse: 'later',
      body: 'Body\n',
    })
    expect(parseSkillMarkdown(encoded)).toEqual({
      name: 'ok-name',
      description: 'desc',
      whenToUse: 'later',
      body: 'Body',
    })
    expect(parseSkillMarkdown('no-frontmatter')).toBeUndefined()
    expect(parseSkillMarkdown('---\n')).toBeUndefined()
    expect(parseSkillMarkdown('not-yaml\n---\n')).toBeUndefined()
    expect(parseSkillMarkdown('---\n[]\n---\nbody\n')).toBeUndefined()
    expect(parseSkillMarkdown('---\nname: Bad Name\ndescription: x\n---\n')).toBeUndefined()
    expect(parseSkillMarkdown('---\nname: ok-name\n---\n')).toBeUndefined()
    expect(parseSkillMarkdown('---\nname: ok-name\ndescription: "  "\n---\n')).toBeUndefined()
    expect(parseSkillMarkdown('---\nname: ok-name\ndescription: x\n---\nbody')).toEqual({
      name: 'ok-name',
      description: 'x',
      body: 'body',
    })
    expect(parseSkillMarkdown('---\r\nname: ok-name\r\ndescription: x\r\n---\r\nbody')).toEqual({
      name: 'ok-name',
      description: 'x',
      body: 'body',
    })
    expect(parseSkillMarkdown('---\nname: ok-name\ndescription: x\n---')).toEqual({
      name: 'ok-name',
      description: 'x',
      body: '',
    })
    expect(encodeSkillMarkdown({ name: 'ok-name', description: 'd', body: 'x' })).not.toContain('whenToUse')
    expect(skillBodyExceedsLimit('x'.repeat(MAX_SKILL_BODY_BYTES))).toBe(false)
    expect(skillBodyExceedsLimit('x'.repeat(MAX_SKILL_BODY_BYTES + 1))).toBe(true)
  })
})

describe('skill library paths', () => {
  it('rejects invalid names and empty joins', () => {
    expect(() => bundleSkillPath('/tmp/skills', 'Not Valid')).toThrow(/invalid skill name/)
    expect(() => containedJoin('/tmp/skills', '.')).toThrow(/escapes/)
    expect(() => containedJoin('/tmp/skills', '/etc')).toThrow(/escapes/)
    expect(userSkillsRoot({ DSH_HOME: '/tmp/dsh-home' }).replace(/\\/g, '/')).toMatch(/\/skills$/)
  })
})
