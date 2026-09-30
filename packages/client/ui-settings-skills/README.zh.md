---
description: "在 Web 设置中列出、创建、编辑和删除用户与项目 skill 的页面。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-skills

[English](README.md) | 中文

## 概述

**Skills** 设置页让 Web 用户查看已保存的 skill，并创建、编辑或删除用户根与项目根下的条目。随包 skill 保持可见且只读。斜杠菜单 `/` 的调用仍在 [`ui-skill`](../ui-skill/README.zh.md)。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

打开设置并选择 **Skills**。页面列出目录行，从一行打开编辑器，并提供 **新建 skill**。新建默认写入用户根（`$DSH_HOME/skills`）。保存到项目需要已打开的工作区。页面在挂载前不调用 Remote。

### 你能做什么、不能做什么

可写行可在确认后编辑或删除。只读行只能查看。宿主发出 `skills/change` 时，composer 的 `/` 菜单会刷新。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部——点击展开</summary>

插件以 `id: 'skills'`、`order: 18` 注入 `settings.section`。注入回调包装 `ctx.remote.skillLibrary`。`useWorkspaces` 的第一条工作区路径即项目根。

### 源码对照

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | 文案词典与设置注册 |
| [`src/client/SkillsSection.tsx`](src/client/SkillsSection.tsx) | 列表、编辑器与删除对话框 |
| — | 不发布运行时 invariant 伴生包；本包拥有一项设置贡献。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [ui-settings](../ui-settings/README.zh.md) — 声明 `settings.section` 的领域基座。
- [skill-library](../../host/skill-library/README.zh.md) — 页面背后的 Host Remote。
- [ui-skill](../ui-skill/README.zh.md) — 斜杠菜单 skill 调用。

-----

<a id="model-experience"></a>
## 模型体验

无。本包是浏览器侧设置页，不注册任何面向模型的内容。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明页面能覆盖什么。

- **一条工作区路径** — 项目保存使用 Workspace 快照的第一条路径；页面不选择多个工作区。
- **不编辑包内资源** — 表单只编辑 `SKILL.md` 的 frontmatter 与正文。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
