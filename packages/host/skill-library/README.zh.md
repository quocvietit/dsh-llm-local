---
description: "面向 Web 设置页的 Host Remote：列出并增删改用户与项目 skill 文件。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-skill-library

[English](README.md) | 中文

## 概述

客户端可以列出、创建、更新和删除 `$DSH_HOME/skills` 与 `<workspace>/.dsh/skills` 下的 skill 文件。随包及其他注册表 skill 以只读行出现。供 `/` 使用的会话 `skills/list` 目录不变；本 Remote 写入的正是文件系统提供方已经监视的那些文件。

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

当设置页需要管理本地 skill 时，在 Web Host 组合中挂载本插件。Remote 命名空间为 `skillLibrary`。创建会写入目录包 `<name>/SKILL.md`。名称必须是 kebab-case。写入项目根需要绝对路径 `workspaceRoot`。写入成功会发出 `skills/change`，以便斜杠目录刷新。

### 何时选择它

当受信任的 Web 客户端需要对磁盘上的用户或项目 skill 做增删改查时选择它。若部署只通过 `/` 调用 skill、从不在设置里编写，则跳过。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部——点击展开</summary>

网关每次 `list` 都扫描两个可写根，并在存在 `ctx.skills` 时追加只读注册表行。变更只解析受约束路径，拒绝过大正文，且从不写入随包或自定义根。

### 源码对照

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | `SkillLibraryGateway`：Remote 方法与磁盘变更 |
| [`src/types.ts`](src/types.ts) | 请求与结果类型 |
| [`src/paths.ts`](src/paths.ts) | 根解析与路径约束 |
| [`src/codec.ts`](src/codec.ts) | SKILL.md 编码与解析 |
| — | 不发布运行时 invariant 伴生包；文件系统即持久存储。 |

Typert 生成 `./typert` 与 `./remote` 暴露的 Host 与 Client Remote 产物。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Remote 组装](../../api/remotes/README.zh.md) — 客户端如何在不导入本 Host 实现的情况下消费 `skillLibrary`。
- [skill-filesystem](../../skill/skill-filesystem/README.zh.md) — 同一批根的发现与监视。
- [Skills 设置界面](../../client/ui-settings-skills/README.zh.md) — 调用本 Remote 的设置页。

-----

<a id="model-experience"></a>
## 模型体验

无。这个 Host Remote 写入 skill 文件，不注册任何面向模型的内容。文件系统提供方与 `dsh-tool-skill` 拥有目录投影。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明本库可以改写哪些 skill。

- **仅两个可写根** — 创建、更新和删除只作用于 `$DSH_HOME/skills` 与 `<workspace>/.dsh/skills`。随包、自定义和 `.agents` skill 只读列出。
- **会话目录保持独立** — `skills/list` 仍是 `/` 的只调用目录；本 Remote 不把 skill 正文载入 Session。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
