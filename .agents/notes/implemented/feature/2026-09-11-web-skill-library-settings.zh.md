# Agent Note: Web Settings skill library

Status: implemented

[English](2026-09-11-web-skill-library-settings.md) | 中文

## Problem

Web 客户端可以从 `/` 调用 skill，也可以展示 `skill` 工具行，但没有页面管理部署实际编写的文件。Host `skills/list` 按会话寻址且只读。把 skill 放在 `$DSH_HOME/skills` 或 `<workspace>/.dsh/skills` 的用户只能在产品外改文件系统。

## Decision

Host Remote `@deepseek-ai/dsh-host-skill-library`（`skillLibrary`）列出磁盘 skill，且只改写两个根：`$DSH_HOME/skills`（用户）和 `<workspace>/.dsh/skills`（项目）。创建写入 `<name>/SKILL.md`。名称使用 `isSkillName`。随包及其他注册表 skill 只读出现。路径拼接保持在所选根内。成功变更发出 `skills/change`。

Web 设置页 `@deepseek-ai/dsh-client-ui-settings-skills` 占据 `settings.section`（`id: 'skills'`，`order: 18`）。它不扩展 `ui-skill`，也不给会话 `skills/list` 增加方法。`api-remotes` 转发 `skills/change`；`ui-skill` 在该事件上丢弃其按会话的斜杠目录缓存。

## Alternatives considered

**把 create/update/delete 加进 `SessionSkillCatalog.list`。** 否决，因为该 Remote 按一个 Session 组合给 `/` 候选寻址。文件增删改查是 Host 主目录和工作区磁盘，不是冷 Session 读取。

**经 `workspace-files` 写入。** 否决，因为该 API 不暴露变更，且用户 skill 在 `$DSH_HOME` 下，位于会话工作区之外。

**把页面放进 `ui-skill`。** 否决，因为调用（`/` 加工具行）与管理（设置 CRUD）是不同功能；第二个插件遵循现有设置分区包。

## Consequences

Web 用户可以不离开设置就编写 skill。斜杠目录仍可由磁盘加上现有 skill 注册表重建。项目保存使用 Workspace 快照的第一条路径。页面不编辑 `SKILL.md` 以外的包内资源文件。
