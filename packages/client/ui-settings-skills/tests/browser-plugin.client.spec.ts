// @vitest-environment jsdom
import { Context, Service } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject, NS } from '../src/client/index.ts'
import { SkillsSection } from '../src/client/SkillsSection.tsx'
import type { SkillsSectionInjected } from '../src/client/SkillsSection.tsx'
import { apply as hostApply } from '../src/index.ts'

usePinnedBrowserLanguages('zh-CN')
afterEach(cleanup)

type ListResult =
  | { readonly ok: true; readonly value: { skills: readonly unknown[] } }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  class RemoteService extends Service {
    constructor(serviceCtx: Context) {
      super(serviceCtx, 'remote')
    }
  }
  new RemoteService(ctx)
  const list = vi.fn<() => Promise<ListResult>>().mockResolvedValue({ ok: true, value: { skills: [] } })
  ctx.provide('remote.skillLibrary', {
    list,
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, list }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'settings.section': { kind: 'list', scope: 'root' } },
  } as never, () => null)
}

describe('ui-settings-skills browser plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares only the services used by the Settings Remote contribution', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote', 'remote.skillLibrary'])
  })

  it('registers a localized section without reading the Remote eagerly', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    const entry = b.slots.entries('settings.section')[0]!
    expect(entry.component).toBe(SkillsSection)
    expect(entry.options).toMatchObject({ id: 'skills', order: 18 })
    expect(entry.locale).toBe(NS)
    expect(resolveSlotLabel(entry.options.label)).toBe('技能')
    expect(b.list).not.toHaveBeenCalled()

    const injected = (entry.inject as unknown as () => SkillsSectionInjected)()
    await expect(injected.list()).resolves.toEqual({ skills: [] })
    await expect(injected.list('/workspace')).resolves.toEqual({ skills: [] })
    expect(b.list).toHaveBeenNthCalledWith(2, { workspaceRoot: '/workspace' })
    b.list.mockResolvedValueOnce({ ok: false, error: { code: 'REMOTE_ERROR', message: 'unavailable' } })
    await expect(injected.list()).rejects.toThrow('skillLibrary.list failed: REMOTE_ERROR: unavailable')

    const remote = b.ctx.get('remote.skillLibrary') as {
      get: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
    }
    const record = {
      name: 'draft-review',
      description: 'Review a draft',
      body: 'Read it.',
      source: 'user-dsh',
      location: 'user' as const,
      editable: true,
    }
    remote.get.mockResolvedValue({ ok: true, value: record })
    await expect(injected.get('draft-review', 'user')).resolves.toEqual(record)
    await expect(injected.get('draft-review', 'user', '/workspace')).resolves.toEqual(record)
    remote.get.mockResolvedValueOnce({ ok: false, error: { code: 'MISSING', message: 'gone' } })
    await expect(injected.get('draft-review', 'other')).rejects.toThrow('skillLibrary.get failed: MISSING: gone')

    remote.create.mockResolvedValue({ ok: true, value: record })
    await expect(injected.create({
      name: 'draft-review',
      description: 'Review a draft',
      body: 'Read it.',
      location: 'user',
    })).resolves.toEqual(record)
    remote.create.mockResolvedValueOnce({ ok: false, error: { code: 'DUP', message: 'exists' } })
    await expect(injected.create({
      name: 'draft-review',
      description: 'Review a draft',
      body: 'Read it.',
      location: 'user',
    })).rejects.toThrow('skillLibrary.create failed: DUP: exists')

    remote.update.mockResolvedValue({ ok: true, value: record })
    await expect(injected.update({
      name: 'draft-review',
      description: 'Review a draft',
      body: 'Read it.',
      location: 'user',
      workspaceRoot: '/workspace',
    })).resolves.toEqual(record)
    remote.update.mockResolvedValueOnce({ ok: false, error: { code: 'IO', message: 'fail' } })
    await expect(injected.update({
      name: 'draft-review',
      description: 'Review a draft',
      body: 'Read it.',
      location: 'project',
      workspaceRoot: '/workspace',
    })).rejects.toThrow('skillLibrary.update failed: IO: fail')

    remote.delete.mockResolvedValue({ ok: true, value: undefined })
    await expect(injected.remove('draft-review', 'user')).resolves.toBeUndefined()
    await expect(injected.remove('draft-review', 'project', '/workspace')).resolves.toBeUndefined()
    remote.delete.mockResolvedValueOnce({ ok: false, error: { code: 'GONE', message: 'missing' } })
    await expect(injected.remove('draft-review', 'user')).rejects.toThrow('skillLibrary.delete failed: GONE: missing')
    await b.ctx.fiber.dispose()
  })

  it('follows locale and recovers across late declaration and declarer reload', async () => {
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(b.slots.entries('settings.section')).toHaveLength(0)

    const stop = declare(b.slots)
    await vi.waitFor(() => { expect(b.slots.entries('settings.section')).toHaveLength(1) })
    b.locale.setLocale('en')
    expect(resolveSlotLabel(b.slots.entries('settings.section')[0]!.options.label)).toBe('Skills')

    stop()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    declare(b.slots)
    await vi.waitFor(() => {
      expect(b.slots.entries('settings.section')[0]?.component).toBe(SkillsSection)
    })

    await fiber.dispose()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(() => b.locale.register(NS, 'zh', {})).not.toThrow()
    await b.ctx.fiber.dispose()
  })
})
