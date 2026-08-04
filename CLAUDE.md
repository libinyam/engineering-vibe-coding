# eng-vibe 仓库 — 开发约定（改任何文件前必读）

这是一个 Claude Code plugin 仓库：skill（六步工作流）+ reviewer 子代理 + 守护 hook。没有构建步骤，交付物就是这些 Markdown 和 JS 文件本身。

## 硬约定（每条具体到可验证）

1. **版本同步**：任何功能性改动（skill/references 内容、agent、hook 行为）必须同步 bump `.claude-plugin/plugin.json` 的 `version`；纯 README/LICENSE 改动不 bump。
2. **hook 静默契约**：`hooks/guard.js` 在目标项目既无 `eng-vibe.config.json` 也无 `guard`/`test:guard` npm script 时，必须零输出、exit 0（README 承诺的"零打扰"）。改 hook 后必须在无配置目录下实际跑一次验证。
3. **跨文件引用一致性**：以下名称被多处引用，改任何一端必须 grep 全仓库同步：
   - 子代理名 `eng-vibe-reviewer`：agents/ 文件名 + SKILL.md 第 5 步 + README
   - 配置名 `eng-vibe.config.json` 与字段 `guardCommand`：hooks/guard.js + SKILL.md 第 2 步 + README
4. **双语规范**：README.md 中英对照，改一种语言必须同步另一种；skill 和模板正文只用中文。
5. **SKILL.md 的 frontmatter `description` 是自动触发器**：它决定 skill 何时被自动加载，只用英文写、改措辞前先与维护者确认。

## 常见改动菜谱

- 改六步工作流 → `skills/eng-vibe/SKILL.md`（检查引用的 references/ 是否需同步）→ bump version
- 改守护 hook → `hooks/guard.js` → 在"有配置"和"无配置"两种目录各验证一次 → bump version
- 加 reference 文档 → `skills/eng-vibe/references/` + SKILL.md 加链接 + README 结构树补一行（中英双语）
