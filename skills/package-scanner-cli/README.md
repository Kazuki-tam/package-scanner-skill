# PackageScanner CLI Skill

`skills` ecosystem compatible agent skill for running PackageScanner through its public HTTP API.

## Why this version

- No MCP setup is required
- Works in agents that can run shell commands
- Easy to publish and install with `npx skills add`
- The published skill directory contains only the files needed at runtime
- TypeScript source is kept outside the published skill directory while users execute a prebuilt JavaScript helper
- Portable after installation because the skill can fall back to raw HTTP calls when the repo-local helper path is unavailable

## Install

After this repository is published to GitHub, users can install it like this:

```bash
npx skills add <owner>/<repo> --skill package-scanner-cli
```

This uses the npm-distributed `skills` CLI through `npx`, so a separate global install is optional.

Or with a full Git URL:

```bash
npx skills add https://github.com/<owner>/<repo> --skill package-scanner-cli
```

Local testing from this repository:

```bash
npx skills add . --skill package-scanner-cli --list
```

## Runtime model

- The repository-level `src/package_scanner.ts` file is the source of truth for development.
- In this repository, the helper script at `skills/package-scanner-cli/scripts/package_scanner.js` can be used directly.
- In a public installation, the skill may be copied into an agent-specific directory, so repo-relative paths from the user's workspace are not reliable.
- Because of that, `SKILL.md` and `reference.md` prefer raw HTTP or inline Node.js when the helper script is not present in the current workspace.

## Development

Install dev dependencies and rebuild the distributed helper:

```bash
pnpm install
pnpm build
```

## Repo-local helper command

```bash
node skills/package-scanner-cli/scripts/package_scanner.js --help
```

## Files

- `SKILL.md`: activation rules and workflow
- `reference.md`: endpoint and raw HTTP reference
- `examples.md`: trigger phrases and usage examples
- `scripts/package_scanner.js`: Node.js CLI helper for PackageScanner HTTP endpoints

## Extraction target

Recommended public repository structure:

```text
package-scanner-skill/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── src/
│   └── package_scanner.ts
└── skills/
    └── package-scanner-cli/
        ├── SKILL.md
        ├── README.md
        ├── examples.md
        ├── reference.md
        └── scripts/
            └── package_scanner.js
```

## Security notes

- The helper sends only the files you explicitly pass as `--lockfile` and `--package-json`.
- Never send `.npmrc`, access tokens, private registry credentials, or environment files.
- Full scans upload manifest content to the public PackageScanner API, so confirm before scanning private repositories.
- Scan results are indicators, not proof of compromise.

## Publish checklist

- Push this repository to a public GitHub repository
- Verify discovery with `npx skills add <owner>/<repo> --list`
- Verify targeted install with `npx skills add <owner>/<repo> --skill package-scanner-cli -y`
- Rebuild `scripts/package_scanner.js` after changing the repository-level `src/package_scanner.ts`
- Keep `SKILL.md` concise and make sure supporting docs stay one level deep
