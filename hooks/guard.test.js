'use strict';

/**
 * guard.js 全分支黑盒测试(node:test,零依赖)。
 *
 * 每个用例把 guard.js 当真实 hook 进程拉起(spawn + stdin JSON),断言退出码与输出——
 * 践行本 plugin 自己的第 2 步:每条守护分支,故意违反一次,亲眼看它红。
 * 信任存储一律用 ENG_VIBE_TRUST_STORE 指向临时文件,绝不动用户真实的
 * ~/.claude/eng-vibe-trust.json。
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GUARD = path.join(__dirname, 'guard.js');

function newStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-vibe-store-'));
  return path.join(dir, 'trust.json');
}

function runHook(cwd, storePath, env = {}) {
  return spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({ cwd }),
    env: { ...process.env, ENG_VIBE_TRUST_STORE: storePath, ...env },
    encoding: 'utf8',
    timeout: 60_000,
  });
}

function trustCli(args, cwd, storePath) {
  const res = spawnSync(process.execPath, [GUARD, ...args], {
    cwd,
    env: { ...process.env, ENG_VIBE_TRUST_STORE: storePath },
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, `trust CLI 失败: ${res.stderr}`);
}

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-vibe-proj-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

const okCommand = (artifact) =>
  `node -e "require('fs').writeFileSync('${artifact}','ok')"`;

function configWith(command) {
  return { 'eng-vibe.config.json': JSON.stringify({ guardCommand: command }) };
}

// ---------- 静默契约(零打扰承诺) ----------

test('无配置项目:零输出 exit 0', () => {
  const dir = makeProject({});
  const res = runHook(dir, newStore());
  assert.equal(res.status, 0);
  assert.equal(res.stdout, '');
  assert.equal(res.stderr, '');
});

test('有 package.json 但无 guard/test:guard 脚本:零输出 exit 0', () => {
  const dir = makeProject({ 'package.json': JSON.stringify({ scripts: { test: 'node -e 0' } }) });
  const res = runHook(dir, newStore());
  assert.equal(res.status, 0);
  assert.equal(res.stderr, '');
});

// ---------- 信任三态(issue #1) ----------

test('未信任项目:不执行命令,exit 2 并提示 --trust/--untrust', () => {
  const dir = makeProject(configWith(okCommand('ran.txt')));
  const res = runHook(dir, newStore());
  assert.equal(res.status, 2);
  assert.match(res.stderr, /--trust/);
  assert.match(res.stderr, /--untrust/);
  assert.match(res.stderr, /不要代替用户执行/);
  assert.equal(fs.existsSync(path.join(dir, 'ran.txt')), false, '未信任时绝不能执行命令');
});

test('--untrust 后:静默放行且不执行命令', () => {
  const store = newStore();
  const dir = makeProject(configWith(okCommand('ran.txt')));
  trustCli(['--untrust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 0);
  assert.equal(res.stderr, '');
  assert.equal(fs.existsSync(path.join(dir, 'ran.txt')), false);
});

test('--trust 后:执行守护命令,成功 exit 0', () => {
  const store = newStore();
  const dir = makeProject(configWith(okCommand('ran.txt')));
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'ran.txt')), true);
});

// ---------- 失败分类(issue #11) ----------

test('守护命令退出码非 0:exit 2,报告含退出码与"约定被违反"', () => {
  const store = newStore();
  const dir = makeProject(configWith(`node -e "process.stdout.write('boom');process.exit(7)"`));
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /退出码 7/);
  assert.match(res.stderr, /这是项目约定被违反的信号/);
  assert.match(res.stderr, /boom/);
});

test('守护命令非 0 且无输出:明示"没有任何输出"', () => {
  const store = newStore();
  const dir = makeProject(configWith('node -e "process.exit(3)"'));
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /退出码 3/);
  assert.match(res.stderr, /没有任何输出/);
});

test('守护命令不存在:报"无法执行"的环境问题,不是"约定被违反"', () => {
  const store = newStore();
  const dir = makeProject(configWith('eng-vibe-definitely-missing-cmd-xyz'));
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /无法执行/);
  assert.doesNotMatch(res.stderr, /这是项目约定被违反的信号/);
});

test('守护命令超时:报"超时"并指向 guardCommand 太慢,不是"约定被违反"', () => {
  const store = newStore();
  const dir = makeProject(configWith('node -e "setTimeout(()=>{},20000)"'));
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store, { ENG_VIBE_GUARD_TIMEOUT_MS: '800' });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /超时/);
  assert.doesNotMatch(res.stderr, /这是项目约定被违反的信号/);
});

// ---------- 配置解析容错(issue #5) ----------

test('eng-vibe.config.json 解析失败:警告但 exit 0,不阻断', () => {
  const dir = makeProject({ 'eng-vibe.config.json': '{"guardCommand": ' });
  const res = runHook(dir, newStore());
  assert.equal(res.status, 0);
  assert.match(res.stderr, /解析失败/);
});

test('解析失败后回退 npm guard 脚本并执行', () => {
  const store = newStore();
  const dir = makeProject({
    'eng-vibe.config.json': '{"guardCommand": ',
    'package.json': JSON.stringify({ scripts: { guard: okCommand('via-npm.txt') } }),
  });
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /解析失败/);
  assert.equal(fs.existsSync(path.join(dir, 'via-npm.txt')), true);
});

// ---------- npm script 回退发现顺序 ----------

test('package.json guard 脚本:被自动发现并执行', () => {
  const store = newStore();
  const dir = makeProject({ 'package.json': JSON.stringify({ scripts: { guard: okCommand('via-npm.txt') } }) });
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'via-npm.txt')), true);
});

test('无 guard 时回退 test:guard 脚本', () => {
  const store = newStore();
  const dir = makeProject({
    'package.json': JSON.stringify({ scripts: { 'test:guard': okCommand('via-test-guard.txt') } }),
  });
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'via-test-guard.txt')), true);
});

test('guard 优先于 test:guard', () => {
  const store = newStore();
  const dir = makeProject({
    'package.json': JSON.stringify({
      scripts: { guard: okCommand('via-guard.txt'), 'test:guard': okCommand('via-test-guard.txt') },
    }),
  });
  trustCli(['--trust'], dir, store);
  const res = runHook(dir, store);
  assert.equal(res.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'via-guard.txt')), true);
  assert.equal(fs.existsSync(path.join(dir, 'via-test-guard.txt')), false);
});
