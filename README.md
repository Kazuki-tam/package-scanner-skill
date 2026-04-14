# PackageScanner Public Skill

Public `skills` ecosystem repository for `package-scanner-cli`.

This skill helps coding agents use the public PackageScanner service to scan npm manifests and lockfiles, search packages for malware history, inspect registry metadata signals, and check published vulnerabilities.

## Quick start with `skills`

This repository is meant to be installed with the `skills` CLI from npm.

You do not need a global install. Run it directly with `npx`:

```bash
npx skills add <owner>/<repo> --skill package-scanner-cli
```

Useful commands:

```bash
# List skills in this repository
npx skills add <owner>/<repo> --list

# Install globally instead of per-project
npx skills add <owner>/<repo> --skill package-scanner-cli -g
```

## Install

List the skills in this repository:

```bash
npx skills add <owner>/<repo> --list
```

Install the PackageScanner skill:

```bash
npx skills add <owner>/<repo> --skill package-scanner-cli
```

## Repository layout

```text
package.json
pnpm-lock.yaml
tsconfig.json
src/
└── package_scanner.ts
skills/
└── package-scanner-cli/
    ├── SKILL.md
    ├── README.md
    ├── examples.md
    ├── reference.md
    └── scripts/
        └── package_scanner.js
```

## Notes

- The published skill is portable: it can use raw HTTP calls when the helper script is not available at a repo-relative path.
- TypeScript source lives in `src/package_scanner.ts`, outside the published skill directory.
- The distributed helper is the built file at `skills/package-scanner-cli/scripts/package_scanner.js`.
- For local development inside this repository, the helper script in `skills/package-scanner-cli/scripts/package_scanner.js` is still available.
- PackageScanner itself supports scanning uploaded manifests and lockfiles, package search, and report sharing through its web flow and related integrations.

## Security model

- This repository is intentionally dependency-light. The helper uses only Node.js standard library modules.
- A full dependency scan uploads the selected lockfile and optionally `package.json` to the public PackageScanner API.
- The skill should never read or send `.npmrc`, auth tokens, private registry credentials, or environment files.
- The skill only inspects the files explicitly provided by the caller. It does not recursively collect arbitrary workspace files.
- Findings should be reported as security signals, not as definitive proof of compromise.

## OSS docs

- `SECURITY.md`: vulnerability disclosure and support policy
- `CONTRIBUTING.md`: contribution workflow and safe testing guidance

## Local validation

```bash
pnpm install
pnpm build
npx skills add . --skill package-scanner-cli --list
node skills/package-scanner-cli/scripts/package_scanner.js health
```
