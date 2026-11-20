import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the folder that holds one sub-folder per skill. */
export const skillsDir = fileURLToPath(new URL('./skills/', import.meta.url));

/** Reads `name` and `description` from a SKILL.md's frontmatter. */
function readFrontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const fields = {};
  for (const line of (match?.[1] ?? '').split('\n')) {
    const at = line.indexOf(':');
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return fields;
}

/** Every skill in the package: its name, description and folder. */
export function listSkills() {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(skillsDir, entry.name);
      const { name, description } = readFrontmatter(join(dir, 'SKILL.md'));
      return { name: name ?? entry.name, description: description ?? '', dir };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
