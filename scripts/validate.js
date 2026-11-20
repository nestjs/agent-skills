// Checks the package before a release: every SKILL.md follows the Agent Skills format with
// portable frontmatter, every relative link resolves, and the versions agree.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const PORTABLE = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

const json = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const pkg = json('package.json');
const plugin = json('.claude-plugin/plugin.json');
const marketplace = json('.claude-plugin/marketplace.json');

if (plugin.version !== pkg.version) errors.push(`plugin.json version ${plugin.version} != package.json version ${pkg.version}`);
if (!marketplace.plugins?.some((entry) => entry.name === plugin.name)) errors.push(`marketplace.json lists no plugin named ${plugin.name}`);

const skillsDir = join(root, 'skills');
const skills = readdirSync(skillsDir).filter((name) => statSync(join(skillsDir, name)).isDirectory());
if (!skills.length) errors.push('no skills found');

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

for (const name of skills) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(file)) {
    errors.push(`${name}: no SKILL.md`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (!frontmatter) {
    errors.push(`${name}: SKILL.md has no frontmatter`);
    continue;
  }
  const fields = Object.fromEntries(
    frontmatter
      .split('\n')
      .filter((line) => /^[a-z-]+:/.test(line))
      .map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]),
  );
  for (const key of Object.keys(fields)) if (!PORTABLE.has(key)) errors.push(`${name}: frontmatter key "${key}" is not portable`);
  if (fields.name !== name) errors.push(`${name}: name "${fields.name}" doesn't match its folder`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fields.name ?? '') || fields.name.length > 64) errors.push(`${name}: invalid name`);
  if (!fields.description) errors.push(`${name}: no description`);
  else if (fields.description.length > 1024) errors.push(`${name}: description is ${fields.description.length} characters (max 1024)`);
  if (fields.compatibility && fields.compatibility.length > 500) errors.push(`${name}: compatibility over 500 characters`);
  const lines = text.split('\n').length;
  if (lines > 500) errors.push(`${name}: SKILL.md has ${lines} lines (keep it under 500)`);
}

for (const file of markdownFiles(skillsDir)) {
  for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+)/g)) {
    if (!existsSync(join(dirname(file), target))) errors.push(`${file.slice(root.length + 1)}: broken link ${target}`);
  }
}

if (errors.length) {
  console.error(`${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`OK: ${skills.length} skills, version ${pkg.version}`);
