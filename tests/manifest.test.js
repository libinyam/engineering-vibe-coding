'use strict';

/**
 * 仓库自身约定的机器守护(把 CLAUDE.md 的硬约定变成会红的测试):
 * - manifest 三件套(plugin/marketplace/hooks.json)结构有效
 * - skill / reviewer 资产存在且 frontmatter 完整
 * - 跨文件引用一致(硬约定 3:名称被多处引用,改一端必须全仓库同步)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function readJson(relPath) {
  return JSON.parse(read(relPath));
}

test('plugin.json:结构有效,version 是语义化版本', () => {
  const plugin = readJson('.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'eng-vibe');
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/, 'version 必须是 x.y.z');
  assert.ok(plugin.description, 'description 不能为空');
  assert.ok(plugin.homepage, 'homepage 不能为空');
});

test('marketplace.json:与 plugin.json 名称一致', () => {
  const mkt = readJson('.claude-plugin/marketplace.json');
  assert.equal(mkt.plugins.length, 1);
  assert.equal(mkt.plugins[0].name, 'eng-vibe');
});

test('hooks.json:绑定编辑事件,指向的 guard.js 存在', () => {
  const hooks = readJson('hooks/hooks.json');
  const binding = hooks.hooks.PostToolUse[0];
  for (const event of ['Edit', 'Write', 'NotebookEdit']) {
    assert.match(binding.matcher, new RegExp(event), `matcher 必须覆盖 ${event}`);
  }
  assert.match(binding.hooks[0].command, /guard\.js/);
  assert.equal(fs.existsSync(path.join(ROOT, 'hooks', 'guard.js')), true);
});

test('skill 与 reviewer:文件存在且 frontmatter 完整', () => {
  const skill = read('skills/eng-vibe/SKILL.md');
  assert.match(skill, /^---\r?\nname: eng-vibe\r?\ndescription: \S.+/);
  const reviewer = read('agents/eng-vibe-reviewer.md');
  assert.match(reviewer, /^---\r?\nname: eng-vibe-reviewer\r?\n/);
});

test('跨文件引用一致(CLAUDE.md 硬约定 3):配置名/字段名/子代理名', () => {
  const docs = {
    'hooks/guard.js': read('hooks/guard.js'),
    'skills/eng-vibe/SKILL.md': read('skills/eng-vibe/SKILL.md'),
    'README.md': read('README.md'),
  };
  for (const [file, content] of Object.entries(docs)) {
    assert.ok(content.includes('eng-vibe.config.json'), `${file} 缺 eng-vibe.config.json 引用`);
    assert.ok(content.includes('guardCommand'), `${file} 缺 guardCommand 引用`);
  }
  for (const file of ['skills/eng-vibe/SKILL.md', 'README.md']) {
    assert.ok(read(file).includes('eng-vibe-reviewer'), `${file} 缺 eng-vibe-reviewer 引用`);
  }
});
