# eng-vibe — Engineering-Grade Vibe Coding Skill

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

**项目级(推荐,随仓库共享给协作者)/ Per-project (recommended):**

```bash
git clone https://github.com/<your-username>/engineering-vibe-coding.git
mkdir -p .claude/skills
cp -r engineering-vibe-coding/skills/eng-vibe .claude/skills/
```

**用户级(所有项目可用)/ User-level (all projects):**

```bash
cp -r engineering-vibe-coding/skills/eng-vibe ~/.claude/skills/
```

安装后 Claude Code 会在相关任务时自动加载,也可显式调用 / Claude Code auto-loads it when relevant, or invoke explicitly:

```
/eng-vibe 开始一个新项目:<你的项目描述>
```

## 内容结构 / Structure

```
skills/eng-vibe/
  SKILL.md                            # 六步工作流主文档 / main workflow
  references/
    constitution-template.md          # CLAUDE.md 宪法模板 / constitution template
    review-checklist.md               # 对抗审查清单 / adversarial review checklist
    ship-checklist.md                 # 交付清单 / ship checklist
```

## Roadmap

- [ ] 升级为 Claude Code plugin:打包 reviewer 子代理 + 守护 hooks(编辑后自动跑守护测试)
- [ ] 配套 template repository:预置守护测试样例、CI 配置的起手仓库
- [ ] 守护测试代码样例库(状态机字面量扫描、共享副本一致性校验)

## License

MIT
