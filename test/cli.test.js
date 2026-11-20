import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { listSkills, skillsDir } from '../index.js';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const temp = [];
const project = () => {
  const dir = mkdtempSync(join(tmpdir(), 'nestjs-skills-'));
  temp.push(dir);
  return dir;
};
const run = (cwd, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, HOME: cwd } });
after(() => temp.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('package', () => {
  it('lists every skill folder with its frontmatter', () => {
    const skills = listSkills();
    assert.deepEqual(skills.map((s) => s.name), readdirSync(skillsDir).filter((n) => !n.startsWith('.')).sort());
    for (const skill of skills) assert.ok(skill.description.length > 50, skill.name);
  });
});

describe('cli', () => {
  it('adds every skill into .agents/skills by default, references included', () => {
    const cwd = project();
    const result = run(cwd, 'add');
    assert.equal(result.status, 0, result.stderr);
    for (const { name } of listSkills()) {
      assert.ok(existsSync(join(cwd, '.agents/skills', name, 'SKILL.md')), name);
      assert.ok(existsSync(join(cwd, '.agents/skills', name, '.nestjs-skills')), name);
    }
    assert.ok(existsSync(join(cwd, '.agents/skills/nestjs-auth/references/authentication.md')));
  });

  it('installs chosen skills for chosen agents, for the user with --global', () => {
    const cwd = project();
    assert.equal(run(cwd, 'add', 'nestjs', 'nestjs-auth', '--agent', 'claude', '--agent', 'cursor').status, 0);
    assert.deepEqual(readdirSync(join(cwd, '.claude/skills')).sort(), ['nestjs', 'nestjs-auth']);
    assert.deepEqual(readdirSync(join(cwd, '.cursor/skills')).sort(), ['nestjs', 'nestjs-auth']);
    const home = project();
    assert.equal(run(home, 'add', 'nestjs-data', '--global').status, 0);
    assert.ok(existsSync(join(home, '.agents/skills/nestjs-data/SKILL.md')));
  });

  it('refreshes its own copies but leaves a foreign folder alone unless --force', () => {
    const cwd = project();
    assert.equal(run(cwd, 'add', 'nestjs').status, 0);
    writeFileSync(join(cwd, '.agents/skills/nestjs/stale.md'), 'old');
    assert.equal(run(cwd, 'add', 'nestjs').status, 0);
    assert.ok(!existsSync(join(cwd, '.agents/skills/nestjs/stale.md')), 'a re-install drops old files');

    mkdirSync(join(cwd, '.agents/skills/nestjs-data'), { recursive: true });
    writeFileSync(join(cwd, '.agents/skills/nestjs-data/SKILL.md'), 'mine');
    const refused = run(cwd, 'add', 'nestjs-data');
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /not installed by this tool/);
    assert.equal(readFileSync(join(cwd, '.agents/skills/nestjs-data/SKILL.md'), 'utf8'), 'mine');
    assert.equal(run(cwd, 'add', 'nestjs-data', '--force').status, 0);
    assert.notEqual(readFileSync(join(cwd, '.agents/skills/nestjs-data/SKILL.md'), 'utf8'), 'mine');
  });

  it('removes only what it installed', () => {
    const cwd = project();
    assert.equal(run(cwd, 'add').status, 0);
    mkdirSync(join(cwd, '.agents/skills/my-own-skill'));
    assert.equal(run(cwd, 'remove').status, 0);
    assert.deepEqual(readdirSync(join(cwd, '.agents/skills')), ['my-own-skill']);
  });

  it('rejects unknown skills and agents', () => {
    const cwd = project();
    assert.match(run(cwd, 'add', 'nope').stderr, /unknown skill "nope"/);
    assert.match(run(cwd, 'add', '--agent', 'vim').stderr, /unknown agent "vim"/);
    assert.equal(run(cwd, 'frobnicate').status, 1);
  });

  it('prints help, the version and the list', () => {
    const cwd = project();
    assert.match(run(cwd).stdout, /Usage: npx @nestjs\/skills/);
    assert.equal(run(cwd, '--version').stdout.trim(), JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version);
    assert.match(run(cwd, 'list').stdout, /nestjs-production/);
  });
});
