---
description: "Web Settings page for listing, creating, editing, and deleting user and project skills."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-skills

English | [中文](README.zh.md)

## Summary

The **Skills** settings page lets Web users inspect saved skills and create, edit, or delete the ones stored under the user or project skill roots. Bundled skills stay visible and read-only. Slash-menu `/` invocation stays in [`ui-skill`](../ui-skill/README.md).

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Open Settings and choose **Skills**. The page lists catalog rows, opens an editor from a row, and offers **New skill**. New skills default to the user root (`$DSH_HOME/skills`). Project saves need an open workspace. The page does not call the Remote until it mounts.

### What you can and cannot do

Writable rows can be edited or deleted after confirmation. Read-only rows open for viewing only. The composer `/` menu refreshes when the Host emits `skills/change`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin injects `settings.section` with `id: 'skills'` and `order: 18`. Injected callbacks wrap `ctx.remote.skillLibrary`. The first workspace path from `useWorkspaces` is the project root.

### Source map

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Locale dictionaries and Settings registration |
| [`src/client/SkillsSection.tsx`](src/client/SkillsSection.tsx) | List, editor, and delete dialogs |
| — | No runtime invariant companion is published; this package owns a Settings contribution. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-settings](../ui-settings/README.md) — the domain base declaring `settings.section`.
- [skill-library](../../host/skill-library/README.md) — the Host Remote behind the page.
- [ui-skill](../ui-skill/README.md) — slash-menu skill invocation.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package is a browser-side Settings page that registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define the page's reach.

- **One workspace path** — project saves use the first Workspace snapshot path; multiple workspaces are not chosen on the page.
- **No bundle assets editor** — the form edits `SKILL.md` frontmatter and body only.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
