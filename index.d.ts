export interface Skill {
  /** The skill's name, as in its SKILL.md frontmatter (equal to its folder name). */
  name: string;
  /** When the skill applies, as in its SKILL.md frontmatter. */
  description: string;
  /** Absolute path of the skill's folder (SKILL.md and references/). */
  dir: string;
}

/** Absolute path of the folder that holds one sub-folder per skill. */
export declare const skillsDir: string;

/** Every skill in the package, sorted by name. */
export declare function listSkills(): Skill[];
