/**
 * Skills settings plugin, browser half. Registers the Skills page into
 * `settings.section`. Host skill files are read and written through
 * `ctx.remote.skillLibrary`. Export discipline: packages/client/AGENTS.md.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { SkillsSection } from './SkillsSection.tsx'
import type { SkillsSectionInjected } from './SkillsSection.tsx'
import { en, zh, type SkillsLocaleKey } from './locales.ts'

export type { SkillsSectionInjected, SkillsSectionProps, SkillWriteInput } from './SkillsSection.tsx'
export type { SkillsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Skills settings page copy. */
    'settings.skills': SkillsLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.skills'

/** Services required by the Settings registration and generated Remote face. */
export const inject = ['slots', 'locale', 'remote', 'remote.skillLibrary']

/**
 * Register the Skills section once the `settings.section` declaration is on the ledger.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const dispose = ctx.locale.register(NS, { zh, en })
    return () => { dispose() }
  }, 'ui-settings-skills: dictionaries')

  const t = ctx.locale.bind(NS)
  const remote = ctx.remote.skillLibrary
  const injected = (): SkillsSectionInjected => ({
    async list(workspaceRoot) {
      const result = await remote.list({ ...workspaceRoot === undefined ? {} : { workspaceRoot } })
      if (!result.ok) throw new Error(`skillLibrary.list failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    async get(name, location, workspaceRoot) {
      const result = await remote.get({
        name,
        location,
        ...workspaceRoot === undefined ? {} : { workspaceRoot },
      })
      if (!result.ok) throw new Error(`skillLibrary.get failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    async create(input) {
      const result = await remote.create(input)
      if (!result.ok) throw new Error(`skillLibrary.create failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    async update(input) {
      const result = await remote.update(input)
      if (!result.ok) throw new Error(`skillLibrary.update failed: ${result.error.code}: ${result.error.message}`)
      return result.value
    },
    async remove(name, location, workspaceRoot) {
      const result = await remote.delete({
        name,
        location,
        ...workspaceRoot === undefined ? {} : { workspaceRoot },
      })
      if (!result.ok) throw new Error(`skillLibrary.delete failed: ${result.error.code}: ${result.error.message}`)
    },
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skills',
    order: 18,
    label: () => t('nav'),
    locale: NS,
    inject: injected,
  }, SkillsSection))
}
