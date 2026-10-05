/** locale apply wiring: service + dictionaries provision. The Language
 * settings row is not registered in this deployment. */
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply as settingsApply, inject as settingsInject } from '@deepseek-ai/dsh-client-ui-settings/client'
import { TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import {
  apply, inject, SETTINGS_NS,
} from '@deepseek-ai/dsh-client-locale/client'
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { LOCALE_SETTINGS_NAMESPACE, LocaleSettingsSchema } from '../src/locale-settings.ts'
import { LanguageRow } from '../src/client/LanguageRow.tsx'

const SLOT = 'settings.general.item'
afterEach(() => { vi.unstubAllGlobals() })

async function bench(preference?: string) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  let revision = 0
  const namespace = () => ({
    ns: LOCALE_SETTINGS_NAMESPACE,
    schema: LocaleSettingsSchema.toJSON(),
    value: preference === undefined ? {} : { preference },
    autoGenerate: true, applies: 'live' as const,
    secrets: [],
    revision,
  })
  const describe = vi.fn(async () => ({
    ok: true as const,
    value: { writable: true, hasDocument: true, namespaces: [namespace()] },
  }))
  const mutate = vi.fn(async (_ns: string, ops: { value: string }[]) => {
    preference = ops[0]!.value
    revision += 1
    return { ok: true as const, value: namespace() }
  })
  const events = new TestRemote(ctx, { settings: { describe, mutate } })
  await ctx.plugin({ inject: [...settingsInject], apply: settingsApply }).await()
  return {
    ctx, slots: ctx.get('slots') as SlotRegistry, describe, mutate, events,
    setHostPreference: (next: string | undefined) => { preference = next; revision += 1 },
  }
}

/** Stand in for the settings shell: declare the General item slot from root. */
function declareItems(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

describe('locale apply', () => {
  it.each(['resolve', 'reject'] as const)('contains a late native initialization %s after unloading', async (outcome) => {
    const b = await bench()
    const ready = Promise.withResolvers<unknown>()
    const read = vi.fn(() => ready.promise)
    const onChange = vi.fn()
    vi.stubGlobal('__DSH_LOCALE__', { read, onChange })
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    try {
      await vi.waitFor(() => { expect(read).toHaveBeenCalledOnce() })
      const disposal = fiber.dispose()
      if (outcome === 'resolve') ready.resolve({ languages: ['zh-CN'], preference: null })
      else ready.reject(new Error('native window closed'))
      await disposal
      expect(b.ctx.get('locale')).toBeUndefined()
      expect(onChange).not.toHaveBeenCalled()
    } finally {
      ready.resolve({ languages: ['zh-CN'], preference: null })
      await b.ctx.fiber.dispose()
    }
  })

  it('awaits native initialization and reports later changes only while mounted', async () => {
    const b = await bench('zh')
    const ready = Promise.withResolvers<unknown>()
    const onChange = vi.fn()
    vi.stubGlobal('__DSH_LOCALE__', { read: () => ready.promise, onChange })
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    try {
      expect(b.ctx.get('locale')).toBeUndefined()
      ready.resolve({ languages: ['en-US'], preference: 'zh' })
      await fiber.await()
      const locale = b.ctx.get('locale') as LocaleRuntime
      expect(locale.getSnapshot().active).toBe('zh')
      expect(onChange).toHaveBeenLastCalledWith('zh')
      locale.setLocale('en')
      expect(onChange).toHaveBeenLastCalledWith('en')
      await fiber.dispose()
      const calls = onChange.mock.calls.length
      b.ctx.emit('locale/change', { active: 'zh', locales: [], revision: 99 })
      expect(onChange).toHaveBeenCalledTimes(calls)
    } finally {
      ready.resolve({ languages: ['en-US'], preference: 'zh' })
      await b.ctx.fiber.dispose()
    }
  })

  // These are wiring specs, not default-language specs. A fresh LocaleRuntime
  // with no jsdom `window` skips browser detection and opens on FALLBACK_LOCALE
  // (en); each test that reads localized copy stages its locale explicitly via
  // setLocale/Host preference instead of leaning on a dead browser pin.

  it('declares the slot service', () => {
    expect(inject).toEqual(['slots', 'remote', 'configForms'])
  })

  it('provides the service with base + settings dictionaries and does not register the Language row', async () => {
    const before = await bench()
    declareItems(before.slots)
    await before.ctx.plugin({ inject: [...inject], apply }).await()
    const locale = before.ctx.get('locale') as LocaleRuntime
    expect(() => locale.register('common', 'zh', {})).toThrow('already has locale')
    expect(() => locale.register('common', 'en', {})).toThrow('already has locale')
    locale.setLocale('zh')
    expect(locale.bind(SETTINGS_NS)('language.title')).toBe('语言')
    expect(before.slots.entries(SLOT).some(e => e.component === LanguageRow)).toBe(false)

    const after = await bench()
    const fiber = after.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    declareItems(after.slots)
    await Promise.resolve()
    expect(after.slots.entries(SLOT).some(e => e.component === LanguageRow)).toBe(false)
  })

  it('loads and refreshes the explicit Host preference after nonblocking activation', async () => {
    const b = await bench()
    b.setHostPreference('zh')
    b.events.emit('settings/document-updated', [LOCALE_SETTINGS_NAMESPACE, 0])
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const locale = b.ctx.get('locale') as LocaleRuntime
    await vi.waitFor(() => { expect(locale.getLocale().active).toBe('zh') })
    b.setHostPreference(undefined)
    b.events.emit('settings/document-updated', [LOCALE_SETTINGS_NAMESPACE, 0])
    await vi.waitFor(() => { expect(locale.getLocale().active).toBe('en') })
    b.setHostPreference('zh')
    b.events.emit('settings/document-updated', [LOCALE_SETTINGS_NAMESPACE, 0])
    await vi.waitFor(() => { expect(locale.getLocale().active).toBe('zh') })
    expect(b.describe).toHaveBeenCalledTimes(4)
  })

  it('teardown without a Language row is quiet', async () => {
    const quiet = await bench()
    const f2 = quiet.ctx.plugin({ inject: [...inject], apply })
    await f2.await()
    await f2.dispose()
    expect(quiet.slots.entries(SLOT)).toHaveLength(0)
  })
})
