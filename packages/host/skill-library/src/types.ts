/** Writable skill roots the library may create, update, or delete. */
export type SkillLibraryLocation = 'user' | 'project'

/** Catalog location for a listed skill, including read-only origins. */
export type SkillLibraryEntryLocation = SkillLibraryLocation | 'other'

/** One skill shown by the library catalog. */
export interface SkillLibraryEntry {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  /** Provider origin bucket (`user-dsh`, `bundled`, …). */
  readonly source: string
  readonly location: SkillLibraryEntryLocation
  /** Whether create/update/remove may target this row. */
  readonly editable: boolean
}

/** Loaded skill body for the Settings editor. */
export interface SkillLibraryRecord extends SkillLibraryEntry {
  readonly body: string
}

/** Catalog list addressed by an optional project workspace. */
export interface SkillLibraryListRequest {
  readonly workspaceRoot?: string
}

/** Point-in-time library catalog. */
export interface SkillLibraryListValue {
  readonly skills: readonly SkillLibraryEntry[]
}

/** Load one skill body. */
export interface SkillLibraryGetRequest {
  readonly name: string
  readonly location: SkillLibraryEntryLocation
  readonly workspaceRoot?: string
}

/** Create a directory-bundle skill under a writable root. */
export interface SkillLibraryWriteRequest {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly body: string
  readonly location: SkillLibraryLocation
  readonly workspaceRoot?: string
}

/** Delete one writable skill. */
export interface SkillLibraryRemoveRequest {
  readonly name: string
  readonly location: SkillLibraryLocation
  readonly workspaceRoot?: string
}
