#!/usr/bin/env node
/**
 * eng-vibe 守护 hook(PostToolUse: Edit|Write|NotebookEdit)
 *
 * 每次 AI 编辑/写入文件后自动执行项目的守护测试。
 * 红了就把输出以 exit code 2 塞回给 Claude,强制它立刻修复——
 * 这是"约定必须机器可执行"的兜底闸门,不经过模型判断,百分之百执行。
 *
 * 信任门槛(issue #1):守护命令以用户权限运行,因此绝不自动执行
 * 未信任项目里的任何命令(防不可信仓库借 hook 实现 RCE,同 npm 恶意 postinstall)。
 * 信任记录保存在用户主目录 ~/.claude/eng-vibe-trust.json(可用环境变量
 * ENG_VIBE_TRUST_STORE 覆盖,测试用),仓库自身无法替克隆者授予信任。
 * 三种状态:
 *   trusted   → 正常执行守护命令
 *   untrusted → 用户显式 --untrust 过,静默放行(exit 0,零输出)
 *   unknown   → 拦截一次并提示授权(exit 2),把 --trust/--untrust 命令
 *               转给用户人工执行;在用户决定前,每次编辑都会看到提示
 * 授权/撤销授权(由用户本人在项目根目录执行,不要让 AI 代跑):
 *   node <本文件绝对路径> --trust
 *   node <本文件绝对路径> --untrust
 *
 * 守护命令的发现顺序(找到第一个即用):
 *   1. 项目根目录 eng-vibe.config.json 的 "guardCommand" 字段
 *   2. package.json scripts 里的 "guard" → 执行 `npm run guard`
 *   3. package.json scripts 里的 "test:guard" → 执行 `npm run test:guard`
 * 都没有 → 静默放行(exit 0),不打扰未接入守护测试的项目。
 *
 * 约定:守护命令应当快(几秒内)——它只跑约定扫描类测试,不跑全量业务测试。
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TRUST_STORE_PATH =
  process.env.ENG_VIBE_TRUST_STORE || path.join(os.homedir(), '.claude', 'eng-vibe-trust.json');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function canonicalProjectPath(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

function readTrustStore() {
  try {
    const store = JSON.parse(fs.readFileSync(TRUST_STORE_PATH, 'utf8'));
    return {
      trusted: Array.isArray(store.trusted) ? store.trusted : [],
      untrusted: Array.isArray(store.untrusted) ? store.untrusted : [],
    };
  } catch {
    return { trusted: [], untrusted: [] };
  }
}

function writeTrustStore(store) {
  fs.mkdirSync(path.dirname(TRUST_STORE_PATH), { recursive: true });
  fs.writeFileSync(TRUST_STORE_PATH, JSON.stringify(store, null, 2) + '\n');
}

function trustState(projectPath) {
  const key = canonicalProjectPath(projectPath);
  const store = readTrustStore();
  if (store.trusted.includes(key)) return 'trusted';
  if (store.untrusted.includes(key)) return 'untrusted';
  return 'unknown';
}

// CLI 入口:--trust / --untrust,作用于执行时所在目录,由用户人工运行
if (process.argv.includes('--trust') || process.argv.includes('--untrust')) {
  const adding = process.argv.includes('--trust');
  const key = canonicalProjectPath(process.cwd());
  const store = readTrustStore();
  store.trusted = store.trusted.filter((p) => p !== key);
  store.untrusted = store.untrusted.filter((p) => p !== key);
  (adding ? store.trusted : store.untrusted).push(key);
  writeTrustStore(store);
  process.stdout.write(
    `[eng-vibe guard] ${adding ? '已信任,后续编辑将执行守护命令' : '已标记不启用守护,后续编辑静默放行'}: ${key}\n`
  );
  process.exit(0);
}

function findGuardCommand(cwd) {
  const cfgPath = path.join(cwd, 'eng-vibe.config.json');
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.guardCommand && typeof cfg.guardCommand === 'string') return cfg.guardCommand;
    } catch (e) {
      // 配置文件坏了也是要报给 Claude 的问题
      process.stderr.write(`[eng-vibe guard] eng-vibe.config.json 解析失败: ${e.message}\n`);
      process.exit(2);
    }
  }
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const scripts = pkg.scripts || {};
      if (scripts.guard) return 'npm run guard --silent';
      if (scripts['test:guard']) return 'npm run test:guard --silent';
    } catch {
      // package.json 解析失败不属于守护范畴,放行
    }
  }
  return null;
}

function main() {
  let input = {};
  try {
    input = JSON.parse(readStdin() || '{}');
  } catch {
    // 无法解析 hook 输入时不阻塞
  }
  const cwd = input.cwd || process.cwd();

  const cmd = findGuardCommand(cwd);
  if (!cmd) process.exit(0);

  const state = trustState(cwd);
  if (state === 'untrusted') process.exit(0);
  if (state === 'unknown') {
    process.stderr.write(
      `[eng-vibe guard] 项目未信任,守护命令未执行。\n` +
        `这不是代码问题:eng-vibe 出于安全不会自动执行未信任项目的守护命令(同 npm 不会自动跑陌生包的 postinstall)。\n` +
        `请把下面两条命令之一原样转给用户,由用户本人在项目根目录执行,不要代替用户执行:\n` +
        `  启用守护: node "${__filename}" --trust\n` +
        `  永久跳过: node "${__filename}" --untrust\n` +
        `在用户做出决定前,每次编辑都会看到本提示。\n`
    );
    process.exit(2);
  }

  try {
    execSync(cmd, { cwd, stdio: 'pipe', timeout: 50_000 });
    process.exit(0);
  } catch (e) {
    const out = [e.stdout, e.stderr]
      .filter(Boolean)
      .map((b) => b.toString())
      .join('\n')
      .trim();
    process.stderr.write(
      `[eng-vibe guard] 守护测试失败(命令: ${cmd})。这是项目约定被违反的信号,必须立刻修复后再继续:\n\n${out.slice(-4000)}\n`
    );
    process.exit(2);
  }
}

main();
