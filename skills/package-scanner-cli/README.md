# PackageScanner CLI Skill

`skills` ecosystem compatible agent skill for running PackageScanner through its public HTTP API.

## Why this version

- No MCP setup is required
- Works in agents that can run shell commands
- Easy to publish and install with `npx skills add`
- The published skill directory contains only the files needed at runtime
- TypeScript source lives in the repository under `src/` while users run the prebuilt JavaScript helper under `scripts/`
- Portable after installation because the skill can fall back to raw HTTP when the helper is not on disk in the current workspace

## Install

After this repository is published to GitHub, users can install it like this:

```bash
npx skills add Kazuki-tam/package-scanner-skill --skill package-scanner-cli
```

Or with a full Git URL:

```bash
npx skills add https://github.com/Kazuki-tam/package-scanner-skill --skill package-scanner-cli
```

Local testing from this repository:

```bash
npx skills add . --skill package-scanner-cli --list
```

## Path contexts (helper vs portable HTTP)

| Context                                 | How to run the helper                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Cloning this repo**                   | From repo root: `node skills/package-scanner-cli/scripts/package_scanner.js …`                            |
| **After `skills add` copies the skill** | `cd` to the installed skill directory (where `SKILL.md` lives), then: `node scripts/package_scanner.js …` |
| **Helper missing or unknown path**      | Use `curl` or inline Node.js from [reference.md](reference.md) — do not guess repo-relative paths         |

## Runtime model

- `src/` in the repository is the source of truth; `pnpm build` compiles it into `scripts/*.js`.
- `scripts/package_scanner.js` is the CLI entry point. TypeScript may emit additional `scripts/*.js` modules; keep them together when copying or packaging the skill.
- In arbitrary workspaces, `SKILL.md` and `reference.md` prefer raw HTTP or inline Node.js when the helper is not present next to the agent.

## Development

Install dev dependencies and rebuild the distributed helper:

```bash
pnpm install
pnpm build
pnpm verify:artifacts
```

## Repo-local helper (from repository clone)

```bash
node skills/package-scanner-cli/scripts/package_scanner.js --help
```

## Files

| File                         | Role                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `SKILL.md`                   | When to activate and workflow steps                                           |
| `reference.md`               | Endpoints, payload shape, portable `curl` / Node snippets                     |
| `examples.md`                | Trigger phrases and example agent behavior                                    |
| `scripts/package_scanner.js` | CLI entry (Node). Companion `.js` files in `scripts/` are required if present |

## Extraction target

Layout of this repository (skill files live under `skills/package-scanner-cli/`):

```text
package-scanner-skill/
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── src/
│   └── …
└── skills/
    └── package-scanner-cli/
        ├── SKILL.md
        ├── README.md
        ├── examples.md
        ├── reference.md
        └── scripts/
            └── package_scanner.js
            … (and any other emitted .js from tsc)
```

## Security notes

- The helper sends only the files you explicitly pass as `--lockfile` and `--package-json`.
- `--package-json` only accepts files named `package.json`.
- `--lockfile` only accepts `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock`.
- The helper rejects sensitive filenames such as `.npmrc`, `.env*`, and `credentials.json`.
- Never send `.npmrc`, access tokens, private registry credentials, or environment files.
- Full scans upload manifest content to the public PackageScanner API, so confirm before scanning private repositories.
- Scan results are indicators, not proof of compromise.

## Publish checklist

- Push this repository to a public GitHub repository
- Verify discovery with `npx skills add Kazuki-tam/package-scanner-skill --list`
- Verify targeted install with `npx skills add Kazuki-tam/package-scanner-skill --skill package-scanner-cli -y`
- Run `pnpm build` after changing `src/` and commit all generated files under `scripts/`
- Keep `SKILL.md` concise and supporting docs one level deep
