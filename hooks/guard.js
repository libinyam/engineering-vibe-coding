#!/usr/bin/env node
/**
 * eng-vibe 守护 hook(PostToolUse: Edit|Write|NotebookEdit)
 *
 * 每次 AI 编辑/写入文件后自动执行项目的守护测试。
 * 红了就把输出以 exit code 2 塞回给 Claude,强制它立刻修复——
 * 这是"约定必须机器可执行"的兜底闸门,不经过模型判断,百分之百执行。
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
const path = require('path');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
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
