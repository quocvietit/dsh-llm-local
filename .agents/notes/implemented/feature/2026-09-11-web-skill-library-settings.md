# Agent Note: Web Settings skill library

Status: implemented

English | [中文](2026-09-11-web-skill-library-settings.zh.md)

## Problem

The Web client can invoke skills from `/` and can display a `skill` tool row, but it has no page for the files a deployment actually authors. Host `skills/list` is session-addressed and read-only. Users who keep skills under `$DSH_HOME/skills` or `<workspace>/.dsh/skills` had to edit the filesystem outside the product.

## Decision

A Host Remote `@deepseek-ai/dsh-host-skill-library` (`skillLibrary`) lists disk skills and mutates only two roots: `$DSH_HOME/skills` (user) and `<workspace>/.dsh/skills` (project). Create writes `<name>/SKILL.md`. Names use `isSkillName`. Bundled and other registry skills appear as read-only. Path joins stay contained in the chosen root. Successful mutations emit `skills/change`.

The Web Settings page `@deepseek-ai/dsh-client-ui-settings-skills` occupies `settings.section` (`id: 'skills'`, `order: 18`). It does not extend `ui-skill` and does not add methods to session `skills/list`. `api-remotes` forwards `skills/change`; `ui-skill` drops its per-session slash catalog cache on that event.

## Alternatives considered

**Add create/update/delete to `SessionSkillCatalog.list`.** Rejected because that Remote addresses one Session composition for `/` candidates. File CRUD is Host-home and workspace disk, not a cold Session read.

**Write through `workspace-files`.** Rejected because that API exposes no mutation, and user skills live under `$DSH_HOME`, outside a session workspace.

**Put the page in `ui-skill`.** Rejected because invoke (`/` plus the tool row) and manage (Settings CRUD) are different features; a second plugin follows the existing Settings-section packages.

## Consequences

A Web user can author skills without leaving Settings. The slash catalog stays reconstructable from disk plus the existing skill registry. Project saves use the first Workspace snapshot path. Bundle resource files besides `SKILL.md` are not edited on the page.
