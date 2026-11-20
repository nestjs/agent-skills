# NestJS agent skills

Official [Agent Skills](https://agentskills.io) for building and extending [NestJS](https://nestjs.com) applications with coding agents. They give an agent what its training data lacks:
- the current APIs, which are often newer than the model;
- Nest's first-party packages;
- the mistakes that still pass tests: a sign-in that leaks which emails exist, `@IsOptional()` letting `null` through to a 500, a rate limiter that never sees the user, an event stream that outlives a revoked key, and many more.

Each skill is a folder with a `SKILL.md` that holds its rules, plus `references/` with longer recipes. Every recipe was run on the released packages. The skills work with any agent that reads the Agent Skills format: Claude Code, Codex, Cursor and others.

## Skills

| Skill | Use when |
| --- | --- |
| `nestjs` | creating or extending a NestJS application: starting a project, layout, module system, where the docs are, common mistakes |
| `nestjs-feature` | adding or changing endpoints: where code goes, modules and providers, validation (Zod with `@Body({ schema })` or class-validator), status codes, errors, HTTP options, Server-Sent Events |
| `nestjs-auth` | adding or changing authentication or authorization: `@nestjs/authentication` (passwords, sessions, tokens, API keys) and `@nestjs/authorization` (policies) |
| `nestjs-data` | adding or changing persistence: `@nestjs/drizzle` and `@nestjs/typeorm`, migrations, safe updates, paging, transactions |
| `nestjs-testing` | writing, running or fixing tests: unit, service and end-to-end tests, overriding providers and global guards, signing test users in |
| `nestjs-production` | preparing for production: configuration, logs, observability with NestJS Observe, health checks, rate limiting, OpenAPI, shutdown, deployment |

Agents load a skill when its description matches the task, so there's nothing to invoke by hand.

## Install

The skills live in [`skills/`](skills). Install them for one project (committed with the code, so everyone on the team gets them) or for your user account (every project on your machine).

### Claude Code

As a plugin, from this repository's marketplace:

```bash
claude plugin marketplace add nestjs/agent-skills
claude plugin install nestjs@nestjs
```

Or inside a session: `/plugin marketplace add nestjs/agent-skills`, then `/plugin install nestjs@nestjs`. Skills from the plugin are namespaced (`nestjs:nestjs-auth`).

Without the plugin, copy the folders into `.claude/skills/` (project) or `~/.claude/skills/` (user), as in [Any agent](#any-agent).

To preconfigure a repository for your team, add this to its `.claude/settings.json`; each contributor still runs the install once:

```json
{
  "extraKnownMarketplaces": {
    "nestjs": { "source": { "source": "github", "repo": "nestjs/agent-skills" } }
  },
  "enabledPlugins": { "nestjs@nestjs": true }
}
```

### Codex

Codex reads skills from `.agents/skills/` in the repository (and in parent folders up to the repository root) and from `~/.agents/skills/` for your user.

### Cursor

Cursor reads skills from `.agents/skills/` and `.cursor/skills/` in the project, and from `~/.agents/skills/` and `~/.cursor/skills/` for your user. It also loads `.claude/skills/` and `.codex/skills/`.

### Any agent

Copy (or symlink) the skill folders to where your agent loads skills. `.agents/skills/` covers Codex and Cursor at once:

```bash
git clone https://github.com/nestjs/agent-skills.git
```

```bash
mkdir -p .agents/skills && cp -R agent-skills/skills/* .agents/skills/
```

For every project on your machine, use `~/.agents/skills/` instead. A symlink (`ln -s "$PWD/agent-skills/skills/nestjs-auth" ~/.agents/skills/`) keeps a copy current with `git pull`.

Keep each folder whole: `SKILL.md` links to its `references/` with relative paths, and the skills refer to each other by name.

## Updating

- **Claude Code plugin:** `claude plugin marketplace update nestjs`, then `claude plugin update nestjs@nestjs`, or turn on auto-update for the marketplace in `/plugin`.
- **Copies:** `git pull` and copy the folders again (symlinked folders update with the pull).

## Compatibility

Written for NestJS 12 (`@nestjs/core` 12.x) on Node.js 20 or later. The recipes were run on:
- Nest 12.5.1;
- `@nestjs/authentication` 0.1.6 and `@nestjs/authorization` 0.1.4;
- `@nestjs/drizzle` 0.0.2 with Drizzle 1.0 rc, and `@nestjs/typeorm` 12.0.3 with TypeORM 1.1;
- `@nestjs/throttler` 6.8, `@nestjs/swagger` 12.1, `@nestjs/terminus` 12.2, `@nestjs/config` 12.1 and `@nestjs/observe` 0.3.

The skills tell the agent to check the installed version and the [documentation](https://docs.nestjs.com/llms.txt) before relying on what it remembers.

## Format

Each `SKILL.md` follows the [Agent Skills specification](https://agentskills.io/specification):
- `name` matches the folder;
- `description` says when the skill applies, under 1,024 characters;
- the frontmatter uses only portable fields (`name`, `description`, `license`, `compatibility`), so the same files work in every agent and can be uploaded to the Claude apps.

The repository is also a Claude Code plugin (`.claude-plugin/plugin.json`) and its own marketplace (`.claude-plugin/marketplace.json`).

## Contributing

Keep `SKILL.md` files short: rules and pitfalls in the file, longer code in `references/`, one level deep. Before adding an API or a pitfall, check it against the docs and run it on a released version.

Validate the manifests and frontmatter:

```bash
claude plugin validate --strict .
```

## License

[MIT](LICENSE)
