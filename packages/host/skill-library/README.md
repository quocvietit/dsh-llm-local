---
description: "Host Remote for listing and mutating user and project skill files from the Web Settings library page."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-skill-library

English | [中文](README.zh.md)

## Summary

Clients can list, create, update, and delete skill files under `$DSH_HOME/skills` and `<workspace>/.dsh/skills`. Bundled and other registry skills appear as read-only rows. The session `skills/list` catalog used by `/` is unchanged; this Remote writes files the filesystem provider already watches.

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

Mount the plugin in a Web Host composition when Settings should manage local skills. The Remote namespace is `skillLibrary`. Create writes a directory bundle `<name>/SKILL.md`. Names must be kebab-case. Project writes require an absolute `workspaceRoot`. A successful write emits `skills/change` so the slash catalog can refresh.

### When to choose it

Choose it when a trusted Web client needs CRUD for user or project skills on disk. Skip it when the deployment only invokes skills through `/` and never authors them in Settings.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The gateway scans the two writable roots on every `list`, then appends non-editable registry rows from `ctx.skills` when that service is present. Mutations resolve contained paths only, reject oversized bodies, and never write bundled or custom roots.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | `SkillLibraryGateway`: Remote methods and disk mutations |
| [`src/types.ts`](src/types.ts) | Request and result types |
| [`src/paths.ts`](src/paths.ts) | Root resolution and path containment |
| [`src/codec.ts`](src/codec.ts) | SKILL.md encode and parse |
| — | No runtime invariant companion is published; the filesystem is the durable store. |

Typert generates the Host and Client Remote artifacts exposed by `./typert` and `./remote`.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Remote assembly](../../api/remotes/README.md) — how clients consume `skillLibrary` without importing this Host implementation.
- [skill-filesystem](../../skill/skill-filesystem/README.md) — discovery and watching of the same roots.
- [Skills settings surface](../../client/ui-settings-skills/README.md) — the Settings page that calls this Remote.

-----

<a id="model-experience"></a>
## Model Experience

None, as this Host Remote writes skill files and registers nothing model-facing. The filesystem provider and `dsh-tool-skill` own catalog projection.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define which skills the library can mutate.

- **Two writable roots only** — create, update, and delete apply to `$DSH_HOME/skills` and `<workspace>/.dsh/skills`. Bundled, custom, and `.agents` skills are listed read-only.
- **Session catalog stays separate** — `skills/list` remains the invoke-only catalog for `/`; this Remote does not load skill bodies into a Session.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
