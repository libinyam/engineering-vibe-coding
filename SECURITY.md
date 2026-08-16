# Security Policy / 安全策略

## 信任模型 / Trust Model

本 plugin 的守护 hook(`hooks/guard.js`)会在 AI 每次编辑文件后执行**项目配置的命令**(`eng-vibe.config.json` 的 `guardCommand`,或 package.json 的 `guard` / `test:guard` 脚本)。命令以你的用户权限运行,因此默认**不自动执行**——这与 npm 不自动运行陌生包 `postinstall` 脚本是同一类防护。

The guard hook executes commands defined by the project you open. Since those commands run with your user privileges, nothing is executed automatically until you explicitly grant trust — the same class of protection as npm not auto-running a stranger's `postinstall`.

### 三种状态 / Three states

| 状态 | 行为 |
|---|---|
| 未信任(默认) | 不执行任何命令;首次编辑会被拦截(exit 2)并显示授权命令,直到你做出决定 |
| 已信任 | 每次编辑后自动执行守护命令 |
| 显式不启用 | 静默放行,零打扰 |

### 授权与撤销 / Grant & revoke

在项目根目录**由你本人执行**(不要让 AI 代跑,尤其在你不信任的仓库里):

```bash
node "<本 plugin 安装路径>/hooks/guard.js" --trust    # 启用守护
node "<本 plugin 安装路径>/hooks/guard.js" --untrust  # 永久跳过
```

信任记录保存在 `~/.claude/eng-vibe-trust.json`(你的主目录,**不进项目仓库**)。这意味着:一个仓库无论在它的配置里写什么,都无法替克隆者授予信任——授权动作只能发生在你自己机器上。

Trust records live in `~/.claude/eng-vibe-trust.json` in your home directory, never inside the repo. A repository cannot grant trust on behalf of its cloners, no matter what its config contains.

### 已知边界 / Known boundaries

- **信任即全权**:信任一个项目后,它的 `guardCommand` 等同于该项目里的任意构建脚本,以你的权限运行。只信任你愿意执行其 `npm install` 的仓库。
- **AI 代跑 --trust**:技术上无法完全阻止会话内的 AI 执行 `--trust`(它只是个 node 命令),正常权限模式下会弹出确认框——在不可信仓库里请拒绝此类请求。
- **超时上限**:守护命令最长运行 50 秒,超时按失败处理。
- **无遥测**:本 plugin 不收集、不上传任何数据;信任记录仅存在于本地文件。

## 漏洞上报 / Reporting a Vulnerability

请通过 GitHub 私密漏洞报告(仓库 Security 标签页 → Report a vulnerability)或 Security Advisory 上报,勿直接开公开 issue。我们会在确认后尽快修复并发布新版本。

Please report vulnerabilities via GitHub private vulnerability reporting (Security tab → Report a vulnerability) rather than public issues.
