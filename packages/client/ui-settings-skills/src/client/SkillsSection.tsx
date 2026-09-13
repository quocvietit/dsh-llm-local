/** Skills settings section: list, create, edit, and delete local skill files. */

import { useEffect, useState } from 'react'
import type { SkillLibraryEntry, SkillLibraryLocation, SkillLibraryRecord } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { Button, IconPlusOutline16, Input, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SkillsLocaleKey } from './locales.ts'
import css from './SkillsSection.module.css'

/** Registration-side Remote face used by the section. */
export interface SkillsSectionInjected {
  /** List catalog rows for the current user root and optional project workspace. */
  list: (workspaceRoot?: string) => Promise<{ readonly skills: readonly SkillLibraryEntry[] }>
  /** Load one skill body. */
  get: (name: string, location: SkillLibraryEntry['location'], workspaceRoot?: string) => Promise<SkillLibraryRecord>
  /** Create a writable skill. */
  create: (input: SkillWriteInput) => Promise<SkillLibraryRecord>
  /** Replace a writable skill. */
  update: (input: SkillWriteInput) => Promise<SkillLibraryRecord>
  /** Delete a writable skill. */
  remove: (name: string, location: SkillLibraryLocation, workspaceRoot?: string) => Promise<void>
}

/** Fields submitted by create and update. */
export interface SkillWriteInput {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly body: string
  readonly location: SkillLibraryLocation
  readonly workspaceRoot?: string
}

/** Full component props assembled by the Settings slot renderer. */
export type SkillsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.skills'>
  & InjectFace<SkillsSectionInjected>

type Translate = (key: SkillsLocaleKey, params?: Record<string, string>) => string

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly skills: readonly SkillLibraryEntry[] }

type DialogState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly skill: SkillLibraryEntry }
  | { readonly kind: 'delete'; readonly skill: SkillLibraryEntry }

/**
 * Render the Skills settings page.
 * @param props - slot runtime, locale seat, and Remote callbacks.
 */
export function SkillsSection(props: SkillsSectionProps): React.ReactNode {
  const t = props.t as Translate
  const workspaceRoot = props.useWorkspaces(snapshot => snapshot.items[0]?.path)
  const [view, setView] = useState<ViewState>({ status: 'loading' })
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })

  const reload = async (): Promise<void> => {
    setView({ status: 'loading' })
    try {
      const result = await props.list(workspaceRoot)
      setView({ status: 'ready', skills: result.skills })
    } catch {
      setView({ status: 'error' })
    }
  }

  useEffect(() => {
    void reload()
    // Reload when the active workspace path changes.
  }, [workspaceRoot])

  return (
    <section className={css.section}>
      <div className={css.header}>
        <div>
          <h2>{t('title')}</h2>
          <p className={css.subtitle}>{t('subtitle')}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<IconPlusOutline16 />}
          onClick={() => { setDialog({ kind: 'create' }) }}
        >
          {t('create')}
        </Button>
      </div>
      {view.status === 'loading' && <p className={css.status}>{t('loading')}</p>}
      {view.status === 'error' && (
        <div className={css.failure}>
          <p>{t('error')}</p>
          <Button variant="outline" size="sm" onClick={() => { void reload() }}>{t('retry')}</Button>
        </div>
      )}
      {view.status === 'ready' && view.skills.length === 0 && <p className={css.empty}>{t('empty')}</p>}
      {view.status === 'ready' && view.skills.length > 0 && (
        <ul className={css.cards}>
          {view.skills.map(skill => (
            <li key={`${skill.location}:${skill.name}`} className={css.card}>
              <button
                type="button"
                className={css.cardHeader}
                aria-label={skill.name}
                onClick={() => { setDialog({ kind: 'edit', skill }) }}
              >
                <span className={css.cardTitle}>
                  <strong>{skill.name}</strong>
                  <span>{skill.description}</span>
                </span>
                <span className={css.meta}>
                  <Tag tone={skill.editable ? 'info' : 'neutral'}>
                    {t(locationKey(skill.location))}
                  </Tag>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <EditorDialog
        t={t}
        dialog={dialog}
        workspaceRoot={workspaceRoot}
        onClose={() => { setDialog({ kind: 'closed' }) }}
        onAskDelete={skill => { setDialog({ kind: 'delete', skill }) }}
        get={props.get}
        create={props.create}
        update={props.update}
        onSaved={() => {
          setDialog({ kind: 'closed' })
          void reload()
        }}
      />
      <DeleteDialog
        t={t}
        dialog={dialog}
        workspaceRoot={workspaceRoot}
        onClose={() => { setDialog({ kind: 'closed' }) }}
        remove={props.remove}
        onDeleted={() => {
          setDialog({ kind: 'closed' })
          void reload()
        }}
      />
    </section>
  )
}

function locationKey(location: SkillLibraryEntry['location']): SkillsLocaleKey {
  if (location === 'user') return 'locationUser'
  if (location === 'project') return 'locationProject'
  return 'locationOther'
}

function EditorDialog({
  t, dialog, workspaceRoot, onClose, onAskDelete, get, create, update, onSaved,
}: {
  t: Translate
  dialog: DialogState
  workspaceRoot: string | undefined
  onClose: () => void
  onAskDelete: (skill: SkillLibraryEntry) => void
  get: SkillsSectionInjected['get']
  create: SkillsSectionInjected['create']
  update: SkillsSectionInjected['update']
  onSaved: () => void
}): React.ReactNode {
  const open = dialog.kind === 'create' || dialog.kind === 'edit'
  const editing = dialog.kind === 'edit' ? dialog.skill : undefined
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [location, setLocation] = useState<SkillLibraryLocation>('user')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const readOnly = editing !== undefined && !editing.editable

  useEffect(() => {
    if (dialog.kind === 'create') {
      setName('')
      setDescription('')
      setBody('')
      setLocation('user')
      setError(undefined)
      return
    }
    if (dialog.kind !== 'edit') return
    setName(dialog.skill.name)
    setDescription(dialog.skill.description)
    setBody('')
    setLocation(dialog.skill.location === 'project' ? 'project' : 'user')
    setError(undefined)
    let cancelled = false
    void get(dialog.skill.name, dialog.skill.location, workspaceRoot).then(
      record => {
        if (cancelled) return
        setDescription(record.description)
        setBody(record.body)
      },
      () => {
        if (!cancelled) setError(t('error'))
      },
    )
    return () => { cancelled = true }
  }, [dialog, get, t, workspaceRoot])

  const title = dialog.kind === 'create'
    ? t('createTitle')
    : dialog.kind === 'edit'
      ? t(readOnly ? 'viewTitle' : 'editTitle', { name: dialog.skill.name })
      /* v8 ignore next -- the modal is closed for every other dialog kind */
      : ''

  const save = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    const payload: SkillWriteInput = {
      name: name.trim(),
      description: description.trim(),
      body,
      location,
      ...workspaceRoot === undefined ? {} : { workspaceRoot },
    }
    try {
      if (editing === undefined) await create(payload)
      else await update(payload)
      onSaved()
    } catch {
      setError(t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={t('close')}
      footer={(
        <>
          {editing?.editable === true && (
            <Button variant="outline" onClick={() => { onAskDelete(editing) }}>{t('delete')}</Button>
          )}
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          {!readOnly && (
            <Button variant="primary" disabled={busy || name.trim().length === 0 || description.trim().length === 0} onClick={() => { void save() }}>
              {t('save')}
            </Button>
          )}
        </>
      )}
    >
      <div className={css.form}>
        <label className={css.field}>
          {t('name')}
          <Input
            value={name}
            disabled={editing !== undefined}
            onChange={event => { setName(event.target.value) }}
            aria-describedby="skill-name-hint"
          />
        </label>
        {editing === undefined && <p id="skill-name-hint" className={css.hint}>{t('nameHint')}</p>}
        <label className={css.field}>
          {t('description')}
          <Input
            value={description}
            disabled={readOnly}
            onChange={event => { setDescription(event.target.value) }}
          />
        </label>
        {editing === undefined && (
          <fieldset className={css.field}>
            <legend>{t('location')}</legend>
            <div className={css.locations}>
              <Button variant={location === 'user' ? 'primary' : 'outline'} size="sm" onClick={() => { setLocation('user') }}>
                {t('locationUser')}
              </Button>
              <Button
                variant={location === 'project' ? 'primary' : 'outline'}
                size="sm"
                disabled={workspaceRoot === undefined}
                onClick={() => { setLocation('project') }}
              >
                {t('locationProject')}
              </Button>
            </div>
            {workspaceRoot === undefined && <p className={css.hint}>{t('projectUnavailable')}</p>}
          </fieldset>
        )}
        <label className={css.field}>
          {t('body')}
          <textarea
            className={css.textarea}
            value={body}
            disabled={readOnly}
            onChange={event => { setBody(event.target.value) }}
          />
        </label>
        {error !== undefined && <p className={css.error}>{error}</p>}
      </div>
    </Modal>
  )
}

function DeleteDialog({
  t, dialog, workspaceRoot, onClose, remove, onDeleted,
}: {
  t: Translate
  dialog: DialogState
  workspaceRoot: string | undefined
  onClose: () => void
  remove: SkillsSectionInjected['remove']
  onDeleted: () => void
}): React.ReactNode {
  const skill = dialog.kind === 'delete' ? dialog.skill : undefined
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setError(undefined)
    setBusy(false)
  }, [dialog])

  const confirm = async (): Promise<void> => {
    /* v8 ignore next -- bundled rows never open this dialog */
    if (skill === undefined || skill.location === 'other') return
    setBusy(true)
    try {
      await remove(skill.name, skill.location, workspaceRoot)
      onDeleted()
    } catch {
      setError(t('deleteFailed'))
      setBusy(false)
    }
  }

  return (
    <Modal
      open={skill !== undefined}
      onClose={onClose}
      title={t('deleteTitle')}
      closeLabel={t('close')}
      {...skill === undefined ? {} : { description: t('deleteBody', { name: skill.name }) }}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={busy} onClick={() => { void confirm() }}>{t('confirmDelete')}</Button>
        </>
      )}
    >
      {error !== undefined && <p className={css.error}>{error}</p>}
    </Modal>
  )
}
