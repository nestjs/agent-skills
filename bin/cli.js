#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { listSkills } from '../index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const MARKER = '.nestjs-skills';

/** Where each agent loads skills from, for a project and for the user. */
const TARGETS = {
  agents: { project: '.agents/skills', user: '.agents/skills', for: 'Codex, Cursor and other Agent Skills readers' },
  claude: { project: '.claude/skills', user: '.claude/skills', for: 'Claude Code (also read by Cursor)' },
  cursor: { project: '.cursor/skills', user: '.cursor/skills', for: 'Cursor' },
};

const HELP = `Usage: npx @nestjs/skills <command> [skills...] [options]

Commands:
  add [skills...]     Copy skills into the project (all of them when none are named)
  remove [skills...]  Remove skills this tool installed
  list                List the skills in this package

Options:
  --agent <name>      Where to install: ${Object.keys(TARGETS).join(', ')} (default: agents; repeatable)
  --global            Install for your user (~/) instead of the current project
  --dir <path>        Install into this folder instead (overrides --agent and --global)
  --force             Overwrite a folder with the same name that this tool didn't install
  -h, --help          Show this help
  -v, --version       Show the version

Targets:
${Object.entries(TARGETS)
  .map(([name, t]) => `  ${name.padEnd(8)} ${t.project.padEnd(16)} ${t.for}`)
  .join('\n')}

Examples:
  npx @nestjs/skills add                      # every skill into .agents/skills
  npx @nestjs/skills add --agent claude       # into .claude/skills
  npx @nestjs/skills add nestjs nestjs-auth --global
  npx @nestjs/skills remove --agent claude`;

function fail(message) {
  console.error(`nestjs-skills: ${message}`);
  process.exit(1);
}

function parse(argv) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        agent: { type: 'string', multiple: true },
        global: { type: 'boolean', default: false },
        dir: { type: 'string' },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (error) {
    fail(`${error.message}\n\n${HELP}`);
  }
}

/** The folders to install into, from --dir, or --agent and --global. */
function destinations({ agent, global, dir }) {
  if (dir) return [resolve(dir)];
  const names = (agent ?? ['agents']).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
  const unknown = names.filter((name) => !(name in TARGETS));
  if (unknown.length) fail(`unknown agent "${unknown.join('", "')}". Use one of: ${Object.keys(TARGETS).join(', ')}.`);
  const base = global ? homedir() : process.cwd();
  return [...new Set(names.map((name) => join(base, global ? TARGETS[name].user : TARGETS[name].project)))];
}

/** The skills named on the command line, or all of them. */
function selectSkills(names) {
  const all = listSkills();
  if (!names.length) return all;
  const byName = new Map(all.map((skill) => [skill.name, skill]));
  const unknown = names.filter((name) => !byName.has(name));
  if (unknown.length) fail(`unknown skill "${unknown.join('", "')}". Run "npx @nestjs/skills list" to see them.`);
  return names.map((name) => byName.get(name));
}

const shown = (path) => (path.startsWith(process.cwd()) ? relative(process.cwd(), path) || '.' : path.replace(homedir(), '~'));
const installedByUs = (dir) => existsSync(join(dir, MARKER));

function add(names, options) {
  const skills = selectSkills(names);
  for (const target of destinations(options)) {
    mkdirSync(target, { recursive: true });
    const blocked = skills.filter((skill) => existsSync(join(target, skill.name)) && !installedByUs(join(target, skill.name)));
    if (blocked.length && !options.force) {
      fail(
        `${shown(target)} already has ${blocked.map((s) => s.name).join(', ')}, not installed by this tool. ` +
          'Pass --force to replace them.',
      );
    }
    for (const skill of skills) {
      const dest = join(target, skill.name);
      rmSync(dest, { recursive: true, force: true }); // drop files a previous version had
      cpSync(skill.dir, dest, { recursive: true });
      writeFileSync(join(dest, MARKER), `${JSON.stringify({ package: pkg.name, version: pkg.version })}\n`);
    }
    console.log(`Installed ${skills.length} skill${skills.length === 1 ? '' : 's'} (${pkg.name}@${pkg.version}) into ${shown(target)}:`);
    for (const skill of skills) console.log(`  ${skill.name}`);
  }
}

function remove(names, options) {
  const skills = selectSkills(names);
  for (const target of destinations(options)) {
    const removed = [];
    for (const skill of skills) {
      const dest = join(target, skill.name);
      if (installedByUs(dest)) {
        rmSync(dest, { recursive: true, force: true });
        removed.push(skill.name);
      }
    }
    console.log(removed.length ? `Removed from ${shown(target)}: ${removed.join(', ')}` : `Nothing of ${pkg.name} to remove in ${shown(target)}.`);
  }
}

function list() {
  for (const skill of listSkills()) {
    console.log(`${skill.name}\n  ${skill.description}\n`);
  }
}

const { values, positionals } = parse(process.argv.slice(2));
const [command, ...names] = positionals;

if (values.version) {
  console.log(pkg.version);
} else if (values.help || !command) {
  console.log(HELP);
} else if (command === 'add' || command === 'install') {
  add(names, values);
} else if (command === 'remove' || command === 'uninstall') {
  remove(names, values);
} else if (command === 'list' || command === 'ls') {
  list();
} else {
  fail(`unknown command "${command}"\n\n${HELP}`);
}
