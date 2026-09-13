// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SkillLibraryEntry, SkillLibraryRecord } from '@deepseek-ai/dsh-api-remotes/client'
import { SkillsSection } from '../src/client/SkillsSection.tsx'
import type { SkillsSectionInjected, SkillsSectionProps } from '../src/client/SkillsSection.tsx'
import { en, type SkillsLocaleKey } from '../src/client/locales.ts'

afterEach(cleanup)

const t = ((key: SkillsLocaleKey, params?: Record<string, string>): string =>
  Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    en[key],
  )) as SkillsSectionProps['t']

const USER_SKILL: SkillLibraryEntry = {
  name: 'draft-review',
  description: 'Review a draft',
  source: 'user-dsh',
  location: 'user',
  editable: true,
}

const BUNDLED: SkillLibraryEntry = {
  name: 'dsh-badge',
  description: 'Official badge',
  source: 'bundled',
  location: 'other',
  editable: false,
}

function props(overrides: Partial<SkillsSectionInjected> & { workspaceRoot?: string } = {}): SkillsSectionProps {
  const list = overrides.list ?? (async () => ({ skills: [USER_SKILL, BUNDLED] }))
  const get = overrides.get ?? (async () => ({
    ...USER_SKILL,
    body: 'Read the draft.',
  } satisfies SkillLibraryRecord))
  return {
    t,
    close: () => {},
    useWorkspaces: <T,>(select: (snapshot: { items: Array<{ path: string }> }) => T) =>
      select({ items: overrides.workspaceRoot === undefined ? [] : [{ path: overrides.workspaceRoot }] }),
    list,
    get,
    create: overrides.create ?? (async input => ({
      name: input.name,
      description: input.description,
      body: input.body,
      source: input.location === 'user' ? 'user-dsh' : 'project-dsh',
      location: input.location,
      editable: true,
    })),
    update: overrides.update ?? (async input => ({
      name: input.name,
      description: input.description,
      body: input.body,
      source: 'user-dsh',
      location: 'user',
      editable: true,
    })),
    remove: overrides.remove ?? (async () => {}),
  } as unknown as SkillsSectionProps
}

describe('SkillsSection', () => {
  it('lists skills and opens an editor from a row', async () => {
    const get = vi.fn<SkillsSectionInjected['get']>().mockResolvedValue({
      ...USER_SKILL,
      body: 'Read the draft.',
    })
    render(<SkillsSection {...props({ get })} />)
    expect(await screen.findByText('draft-review')).toBeTruthy()
    expect(screen.getByText('dsh-badge')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /draft-review/ }))
    expect(await screen.findByRole('dialog', { name: 'Edit draft-review' })).toBeTruthy()
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: en.body }) as HTMLTextAreaElement).value).toBe('Read the draft.')
    })
    expect(get).toHaveBeenCalledWith('draft-review', 'user', undefined)
  })

  it('creates a skill through the new-skill dialog', async () => {
    const create = vi.fn<SkillsSectionInjected['create']>().mockResolvedValue({
      name: 'new-skill',
      description: 'Does a thing',
      body: 'Do it.',
      source: 'user-dsh',
      location: 'user',
      editable: true,
    })
    const list = vi.fn<SkillsSectionInjected['list']>()
      .mockResolvedValueOnce({ skills: [] })
      .mockResolvedValue({ skills: [{ name: 'new-skill', description: 'Does a thing', source: 'user-dsh', location: 'user', editable: true }] })
    render(<SkillsSection {...props({ list, create, workspaceRoot: '/workspace' })} />)
    expect(await screen.findByText(en.empty)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.create }))
    const dialog = await screen.findByRole('dialog', { name: en.createTitle })
    expect(dialog).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: en.name }), { target: { value: 'new-skill' } })
    fireEvent.change(screen.getByRole('textbox', { name: en.description }), { target: { value: 'Does a thing' } })
    fireEvent.change(screen.getByRole('textbox', { name: en.body }), { target: { value: 'Do it.' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.save }))
    })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'new-skill',
      description: 'Does a thing',
      body: 'Do it.',
      location: 'user',
      workspaceRoot: '/workspace',
    }))
    expect(await screen.findByText('new-skill')).toBeTruthy()
  })

  it('deletes a writable skill after confirmation', async () => {
    const remove = vi.fn<SkillsSectionInjected['remove']>().mockResolvedValue()
    const list = vi.fn<SkillsSectionInjected['list']>()
      .mockResolvedValueOnce({ skills: [USER_SKILL] })
      .mockResolvedValue({ skills: [] })
    render(<SkillsSection {...props({ list, remove })} />)
    fireEvent.click(await screen.findByRole('button', { name: /draft-review/ }))
    fireEvent.click(await screen.findByRole('button', { name: en.delete }))
    expect(await screen.findByRole('dialog', { name: en.deleteTitle })).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.confirmDelete }))
    })
    expect(remove).toHaveBeenCalledWith('draft-review', 'user', undefined)
    expect(await screen.findByText(en.empty)).toBeTruthy()
  })

  it('cancels delete and reports a failed remove', async () => {
    const remove = vi.fn<SkillsSectionInjected['remove']>().mockRejectedValue(new Error('busy'))
    render(<SkillsSection {...props({ remove })} />)
    fireEvent.click(await screen.findByRole('button', { name: /draft-review/ }))
    fireEvent.click(await screen.findByRole('button', { name: en.delete }))
    const deleteDialog = await screen.findByRole('dialog', { name: en.deleteTitle })
    fireEvent.click(within(deleteDialog).getByRole('button', { name: en.cancel }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: en.deleteTitle })).toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: /draft-review/ }))
    fireEvent.click(await screen.findByRole('button', { name: en.delete }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.confirmDelete }))
    })
    expect(await screen.findByText(en.deleteFailed)).toBeTruthy()
  })

  it('shows a retry control when listing fails', async () => {
    const list = vi.fn<SkillsSectionInjected['list']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ skills: [USER_SKILL] })
    render(<SkillsSection {...props({ list })} />)
    expect(await screen.findByText(en.error)).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.retry }))
    })
    expect(await screen.findByText('draft-review')).toBeTruthy()
  })

  it('saves an edited skill and reports save failure', async () => {
    const update = vi.fn<SkillsSectionInjected['update']>()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValue({
        ...USER_SKILL,
        body: 'Updated.',
      })
    render(<SkillsSection {...props({ update })} />)
    fireEvent.click(await screen.findByRole('button', { name: /draft-review/ }))
    expect(await screen.findByRole('dialog', { name: 'Edit draft-review' })).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: en.description }), { target: { value: 'Review a draft carefully' } })
    fireEvent.change(screen.getByRole('textbox', { name: en.body }), { target: { value: 'Updated.' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.save }))
    })
    expect(await screen.findByText(en.saveFailed)).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.save }))
    })
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      name: 'draft-review',
      description: 'Review a draft carefully',
      body: 'Updated.',
      location: 'user',
    }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit draft-review' })).toBeNull()
    })
  })

  it('opens a bundled skill as read-only and reports a get failure', async () => {
    const get = vi.fn<SkillsSectionInjected['get']>().mockRejectedValue(new Error('offline'))
    render(<SkillsSection {...props({ get })} />)
    fireEvent.click(await screen.findByRole('button', { name: /dsh-badge/ }))
    expect(await screen.findByRole('dialog', { name: 'dsh-badge' })).toBeTruthy()
    expect(await screen.findByText(en.error)).toBeTruthy()
    expect(screen.queryByRole('button', { name: en.save })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.cancel }))
  })

  it('creates a project skill when a workspace is open', async () => {
    const create = vi.fn<SkillsSectionInjected['create']>().mockResolvedValue({
      name: 'repo-check',
      description: 'Check the repo',
      body: 'Run tests.',
      source: 'project-dsh',
      location: 'project',
      editable: true,
    })
    const list = vi.fn<SkillsSectionInjected['list']>()
      .mockResolvedValueOnce({ skills: [] })
      .mockResolvedValue({ skills: [{
        name: 'repo-check',
        description: 'Check the repo',
        source: 'project-dsh',
        location: 'project',
        editable: true,
      }] })
    render(<SkillsSection {...props({ list, create, workspaceRoot: '/workspace' })} />)
    fireEvent.click(await screen.findByRole('button', { name: en.create }))
    fireEvent.click(screen.getByRole('button', { name: en.locationProject }))
    fireEvent.change(screen.getByRole('textbox', { name: en.name }), { target: { value: 'repo-check' } })
    fireEvent.change(screen.getByRole('textbox', { name: en.description }), { target: { value: 'Check the repo' } })
    fireEvent.change(screen.getByRole('textbox', { name: en.body }), { target: { value: 'Run tests.' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.save }))
    })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'repo-check',
      location: 'project',
      workspaceRoot: '/workspace',
    }))
  })

  it('edits a project skill, toggles location, and ignores a cancelled load', async () => {
    const PROJECT_SKILL: SkillLibraryEntry = {
      name: 'repo-check',
      description: 'Check the repo',
      source: 'project-dsh',
      location: 'project',
      editable: true,
    }
    const update = vi.fn<SkillsSectionInjected['update']>().mockResolvedValue({
      ...PROJECT_SKILL,
      body: 'Run tests.',
    })
    let resolveGet: ((record: SkillLibraryRecord) => void) | undefined
    const get = vi.fn<SkillsSectionInjected['get']>().mockImplementation(() => new Promise(resolve => {
      resolveGet = resolve
    }))
    const list = vi.fn<SkillsSectionInjected['list']>().mockResolvedValue({ skills: [PROJECT_SKILL] })
    render(<SkillsSection {...props({ list, get, update, workspaceRoot: '/workspace' })} />)
    fireEvent.click(await screen.findByRole('button', { name: /repo-check/ }))
    fireEvent.click(await screen.findByRole('button', { name: en.cancel }))
    await act(async () => {
      resolveGet?.({ ...PROJECT_SKILL, body: 'stale' })
    })
    fireEvent.click(screen.getByRole('button', { name: en.create }))
    fireEvent.click(screen.getByRole('button', { name: en.locationProject }))
    fireEvent.click(screen.getByRole('button', { name: en.locationUser }))
    fireEvent.click(screen.getByRole('button', { name: en.cancel }))
    get.mockResolvedValue({ ...PROJECT_SKILL, body: 'Run tests.' })
    fireEvent.click(screen.getByRole('button', { name: /repo-check/ }))
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: en.body }) as HTMLTextAreaElement).value).toBe('Run tests.')
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.save }))
    })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'repo-check',
      location: 'project',
      workspaceRoot: '/workspace',
    }))
  })

  it('ignores a rejected load after the editor closes', async () => {
    let rejectGet: ((error: Error) => void) | undefined
    const get = vi.fn<SkillsSectionInjected['get']>().mockImplementation(() => new Promise((_, reject) => {
      rejectGet = reject
    }))
    render(<SkillsSection {...props({ get })} />)
    fireEvent.click(await screen.findByRole('button', { name: /draft-review/ }))
    fireEvent.click(await screen.findByRole('button', { name: en.cancel }))
    await act(async () => {
      rejectGet?.(new Error('offline'))
    })
    expect(screen.queryByText(en.error)).toBeNull()
  })
})
