/** Encode and parse local skill Markdown files for the skill library. */

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { isSkillName } from '@deepseek-ai/dsh-skill'

/** Maximum UTF-8 byte length of a skill body accepted by create/update. */
export const MAX_SKILL_BODY_BYTES = 256 * 1024

/** Parsed skill file used by catalog scans and get. */
export interface ParsedSkillFile {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly body: string
}

/**
 * Encode a skill as a directory-bundle `SKILL.md` document.
 * @param fields - kebab-case name, description, optional whenToUse, and Markdown body.
 * @returns YAML frontmatter plus the trimmed body.
 */
export function encodeSkillMarkdown(fields: {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly body: string
}): string {
  const data: Record<string, string> = {
    name: fields.name,
    description: fields.description,
  }
  if (fields.whenToUse !== undefined && fields.whenToUse.length > 0) {
    data.whenToUse = fields.whenToUse
  }
  const body = fields.body.replace(/\s+$/u, '')
  return `---\n${stringifyYaml(data).trimEnd()}\n---\n\n${body}\n`
}

/**
 * Parse a skill Markdown file into catalog fields.
 * @param raw - complete file text.
 * @returns parsed fields, or undefined when frontmatter is missing or invalid.
 */
export function parseSkillMarkdown(raw: string): ParsedSkillFile | undefined {
  const parsed = parseFrontmatter(raw)
  if (parsed === undefined) return undefined
  const name = stringField(parsed.data, 'name')
  const description = stringField(parsed.data, 'description')
  if (name === undefined || description === undefined) return undefined
  if (!isSkillName(name)) return undefined
  const whenToUse = stringField(parsed.data, 'whenToUse')
  return {
    name,
    description,
    ...whenToUse === undefined ? {} : { whenToUse },
    body: parsed.body.trim(),
  }
}

/**
 * Return whether a UTF-8 body exceeds the library write limit.
 * @param body - skill Markdown body.
 * @returns true when the UTF-8 byte length is above {@link MAX_SKILL_BODY_BYTES}.
 */
export function skillBodyExceedsLimit(body: string): boolean {
  return Buffer.byteLength(body, 'utf8') > MAX_SKILL_BODY_BYTES
}

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } | undefined {
  const firstLineEnd = raw.indexOf('\n')
  if (firstLineEnd < 0) return undefined
  const firstLine = raw.slice(0, firstLineEnd).replace(/\r$/u, '')
  if (firstLine !== '---') return undefined
  const start = firstLineEnd + 1
  const closing = findClosingFrontmatter(raw, start)
  if (closing === undefined) return undefined
  const yaml = raw.slice(start, closing.start)
  const parsed = parseYaml(yaml) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  return { data: parsed as Record<string, unknown>, body: raw.slice(closing.bodyStart) }
}

function findClosingFrontmatter(raw: string, start: number): { start: number; bodyStart: number } | undefined {
  let lineStart = start
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline
    const line = raw.slice(lineStart, lineEnd).replace(/\r$/u, '')
    if (line === '---') {
      return { start: lineStart, bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1 }
    }
    if (nextNewline < 0) return undefined
    lineStart = nextNewline + 1
  }
  /* v8 ignore next -- the loop always returns on the last line or continues */
  return undefined
}

function stringField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}
