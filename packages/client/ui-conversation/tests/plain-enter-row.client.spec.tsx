// @vitest-environment jsdom
import type { GlobalStandardProps } from '@deepseek-ai/dsh-client-ui-slots'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionPendingInteractionSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { PlainEnterRow } from '../src/client/settings/PlainEnterRow.tsx'
import type { PlainEnterRowProps } from '../src/client/settings/PlainEnterRow.tsx'
import { ComposerSubmissionPolicy } from '../src/client/input/submission-policy.ts'
import { en } from '../src/client/locales.ts'

const useResource = (() => ({ status: 'none' as const, value: undefined, failure: undefined })) as GlobalStandardProps['useResource']

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function emptySessions() {
  return bindSnapshotSelector(createSnapshotStore<SessionListState>({
    ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
  }))
}

function emptyWorkspaces() {
  return bindSnapshotSelector(createSnapshotStore<WorkspaceSnapshot>({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
  }))
}

function noPendingInteraction() {
  return bindSnapshotSelector(createSnapshotStore<SessionPendingInteractionSnapshot>(new Map()))
}

function mount() {
  const policy = new ComposerSubmissionPolicy()
  const setPlainEnter = vi.fn((behavior: 'newline' | 'send') => { policy.setPlainEnter(behavior) })
  const props: PlainEnterRowProps = {
    usePanelInfo: selector => selector({ activePanelId: null }),
    useSessions: emptySessions(),
    useSessionPendingInteraction: noPendingInteraction(),
    useResource,
    useWorkspaces: emptyWorkspaces(),
    usePlainEnter: bindSnapshotSelector(policy.plainEnter),
    setPlainEnter,
    t: makeTranslate(en),
  }
  render(<PlainEnterRow {...props} />)
  return { policy, setPlainEnter }
}

describe('PlainEnterRow', () => {
  it('explains the send shortcut and defaults to Enter inserting a new line', () => {
    mount()
    expect(screen.getByText('Send shortcut')).toBeDefined()
    expect(screen.getByText('Enter inserts a new line; Ctrl/Alt+Enter sends. Reverse this so Enter sends.')).toBeDefined()
    expect(screen.getByRole('button', { name: /Enter inserts a new line/ }).getAttribute('aria-expanded')).toBe('false')
  })

  it('selects Enter sends, follows later preference changes, and closes outside', () => {
    const b = mount()
    const trigger = screen.getByRole('button', { name: /Enter inserts a new line/ })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Enter sends' }))
    expect(b.setPlainEnter).toHaveBeenCalledWith('send')
    expect(screen.getByRole('button', { name: /Enter sends/ })).toBeDefined()

    act(() => { b.policy.setPlainEnter('newline') })
    const newlineTrigger = screen.getByRole('button', { name: /Enter inserts a new line/ })
    fireEvent.click(newlineTrigger)
    expect(screen.getByRole('menuitem', { name: 'Enter sends' })).toBeDefined()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menuitem', { name: 'Enter sends' })).toBeNull()
  })
})
