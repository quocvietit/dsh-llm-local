/** General Settings row for whether unmodified Enter sends or inserts a newline. */
import { useState } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PlainEnterBehavior } from '../contract/composer-submission.ts'
import type { ConversationKey } from '../locales.ts'
import css from './EnterBehaviorRow.module.css'

/** Registration-side preference face. */
export interface PlainEnterRowInjected {
  hooks: {
    /** Persisted unmodified-Enter preference bound as usePlainEnter. */
    plainEnter: SnapshotStore<PlainEnterBehavior>
  }
  /** Change whether unmodified Enter sends. */
  setPlainEnter: (behavior: PlainEnterBehavior) => void
}

/** Full Settings-row props. */
export type PlainEnterRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'conversation'>
  & InjectFace<PlainEnterRowInjected>

const OPTIONS: readonly {
  id: PlainEnterBehavior
  label: ConversationKey
}[] = [
  { id: 'newline', label: 'settings.sendKey.newline' },
  { id: 'send', label: 'settings.sendKey.send' },
]

/**
 * Render the unmodified-Enter send-shortcut selector.
 * @param props - composed Settings slot props.
 * @returns the preference row.
 */
export function PlainEnterRow({ usePlainEnter, setPlainEnter, t }: PlainEnterRowProps) {
  const behavior = usePlainEnter(value => value)
  const [open, setOpen] = useState(false)
  const selectedLabel = behavior === 'send' ? 'settings.sendKey.send' : 'settings.sendKey.newline'

  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('settings.sendKey.title')}</div>
        <div className={css.desc}>{t('settings.sendKey.description')}</div>
      </div>
      <Menu
        open={open}
        onClose={() => { setOpen(false) }}
        items={OPTIONS.map(option => ({ id: option.id, label: t(option.label) }))}
        selectedId={behavior}
        onSelect={(id) => {
          setOpen(false)
          setPlainEnter(id as PlainEnterBehavior)
        }}
        align="end"
        portal
        anchor={(
          <button
            type="button"
            className={css.selector}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => { setOpen(value => !value) }}
          >
            {t(selectedLabel)}
            <IconChevronDownOutline14 className={css.chevron} />
          </button>
        )}
      />
    </div>
  )
}
