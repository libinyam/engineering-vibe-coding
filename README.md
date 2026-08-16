# eng-vibe — Engineering-Grade Vibe Coding Skill

[![CI](https://github.com/libinyam/engineering-vibe-coding/actions/workflows/ci.yml/badge.svg)](https://github.com/libinyam/engineering-vibe-coding/actions/workflows/ci.yml)

一个 Claude Code skill,把 vibe coding 从"能跑的 demo"推向"敢上线收钱的可交付项目"。

A Claude Code skill that pushes vibe coding from "a demo that runs" to "a product you'd charge money for."

## 核心理念 / Core Idea

> 工程级 vibe coding 不是让 AI 写出更好的代码,而是搭一个让它写不出坏代码的环境。人负责判断和验收,机器负责生成和守门。
>
> Engineering-grade vibe coding isn't making AI write better code. It's building an environment where it can't write bad code. Humans judge and accept; machines generate and guard.

六步工作流 / The 6-step workflow:

1. **先写宪法,再写代码** / Constitution before code — 业务红线、技术约定、产品路线写成 CLAUDE.md,作为每次会话的记忆假体
2. **约定必须机器可执行** / Machine-enforced conventions — 每条规矩配一个会红的守护测试;答不出"违反它时什么会红",规矩就不存在
3. **小步迭代,每步闭环** / Small steps, closed loops — 一次一个 issue,先复述方案再动手
4. **完成 = 证据** / Done = evidence — 测试输出、真实调用、截图;没有验证的功能等于不存在
5. **生成和审查分离** / Separate generation from review — 独立子代理对抗审查:越权、并发、时区、失败路径
6. **交付的是包,不是代码** / Ship a package, not code — 代码 + 测试 + 部署文档 + 已知问题 + 运维路径,缺一项都是 demo

## 安装 / Install

**方式一:Plugin(推荐,完整能力:skill + reviewer 子代理 + 守护 hook)/ As a plugin (recommended, full power):**

在 Claude Code 里执行 / In Claude Code:

```
/plugin marketplace add libinyam/engineering-vibe-coding
/plugin install eng-vibe@eng-vibe-marketplace
```

装上后你获得三层能力 / Three layers after install:

| 层 / Layer | 组件 / Component | 机制 / Mechanism |
|---|---|---|
| 知识 / Knowledge | `eng-vibe` skill | 相关任务时自动加载六步工作流 / auto-loads the 6-step workflow |
| 审查 / Review | `eng-vibe-reviewer` subagent | 每完成一个 issue 大小的功能,独立上下文对抗审查 / adversarial review in an isolated context after each issue-sized change |
| 强制 / Enforcement | guard hook | 每次文件编辑后自动跑守护测试,红了直接拦截并强制修复;需一次 `--trust` 授权 / runs guard tests after every file edit; failures block and bounce back; requires one-time `--trust` |

守护 hook 的接入方式:项目根目录建 `eng-vibe.config.json`,写 `{"guardCommand": "node test/guard.test.js"}`(或 package.json scripts 里定义 `guard` / `test:guard`)。首次编辑时 hook 会拦截并显示授权命令——出于安全,hook 不自动执行未信任项目的任何命令,需由你**本人**在项目根目录执行一次 `node <plugin>/hooks/guard.js --trust`(不想启用则执行 `--untrust`,该项目恢复静默放行)。没有配置的项目 hook 静默放行,零打扰。/ To wire the guard hook, add `eng-vibe.config.json` with a `guardCommand`, or a `guard` / `test:guard` npm script. On the first edit the hook blocks and shows a trust command — nothing runs until **you** run `node <plugin>/hooks/guard.js --trust` yourself in the project root (`--untrust` to permanently skip). Projects without one are silently skipped.

### 安全与信任模型 / Security & Trust Model

守护命令以你的用户权限运行,因此默认不自动执行,需显式授权一次:

Guard commands run with your user privileges, so nothing executes until you explicitly grant trust once:

1. 信任记录保存在 `~/.claude/eng-vibe-trust.json`(你的主目录)——仓库自身无法替克隆者授予信任 / Trust lives in your home directory; a repo can never grant trust on behalf of its cloners.
2. 授权/撤销由用户本人在项目根目录执行 `--trust` / `--untrust`,不要让 AI 代跑 / Run `--trust` / `--untrust` yourself; never let the AI run it for you in a repo you don't trust.
3. 信任即全权:守护命令等同于该项目里的任意构建脚本 / Trusting a project means trusting its build scripts.

详见 [SECURITY.md](SECURITY.md) / See [SECURITY.md](SECURITY.md).

**方式二:只装 skill(轻量)/ Skill only (lightweight):**

```bash
git clone https://github.com/libinyam/engineering-vibe-coding.git
cp -r engineering-vibe-coding/skills/eng-vibe ~/.claude/skills/
```

项目级则复制到项目的 `.claude/skills/` 下。/ For per-project install, copy into the project's `.claude/skills/`.

## 内容结构 / Structure

```
.claude-plugin/
  plugin.json                         # plugin 清单 / plugin manifest
  marketplace.json                    # 让本仓库可被 /plugin marketplace add / makes this repo installable
.github/workflows/ci.yml              # CI:测试 + manifest 校验 + lint / tests + manifest checks + lint
agents/
  eng-vibe-reviewer.md                # 对抗审查子代理 / adversarial reviewer subagent
hooks/
  hooks.json                          # PostToolUse 事件绑定 / event binding
  guard.js                            # 守护测试自动执行脚本 / guard-test runner
  guard.test.js                       # guard.js 全分支测试 / black-box tests for guard.js
tests/
  manifest.test.js                    # manifest/跨文件引用守护 / manifest & cross-reference guard tests
eslint.config.js                      # lint 基线 / lint baseline
.editorconfig                         # 格式基线 / format baseline
package.json                          # npm test / npm run lint 入口 / entrypoints
skills/eng-vibe/
  SKILL.md                            # 六步工作流主文档 / main workflow
  references/
    constitution-template.md          # CLAUDE.md 宪法模板 / constitution template
    review-checklist.md               # 对抗审查清单 / adversarial review checklist
    ship-checklist.md                 # 交付清单 / ship checklist
```

## 开发 / Development

```bash
npm test        # 19 个用例:guard 全分支 + manifest 守护 / 19 cases: guard branches + manifest guards
npm run lint    # eslint / eslint
```

运行时零依赖,需 Node ≥18(lint 仅 devDependencies)/ Zero runtime dependencies, Node ≥18 (eslint is devDependency only).

## Roadmap

- [x] 升级为 Claude Code plugin:打包 reviewer 子代理 + 守护 hooks(编辑后自动跑守护测试)
- [ ] 配套 template repository:预置守护测试样例、CI 配置的起手仓库
- [ ] 守护测试代码样例库(状态机字面量扫描、共享副本一致性校验)

## License

MIT
