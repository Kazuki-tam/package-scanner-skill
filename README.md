# PackageScanner Public Skill

Public `skills` ecosystem repository for `package-scanner-cli`.

This skill helps coding agents use the public PackageScanner service to scan npm manifests and lockfiles, search packages for malware history, inspect registry metadata signals, and check published vulnerabilities.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE).

## Install with `skills`

You do not need a global install. Run the `skills` CLI from npm with `npx`:

```bash
# List skills in this repository
npx skills add Kazuki-tam/package-scanner-skill --list

# Install the PackageScanner skill
npx skills add Kazuki-tam/package-scanner-skill --skill package-scanner-cli

# Optional: global install
npx skills add Kazuki-tam/package-scanner-skill --skill package-scanner-cli -g
```

## Documentation map

| Document                                                                           | Purpose                                                    |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [LICENSE](LICENSE)                                                                 | Terms of use                                               |
| [SECURITY.md](SECURITY.md)                                                         | Vulnerability reporting, data handling, boundaries         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                                 | How to contribute and what to update when behavior changes |
| [skills/package-scanner-cli/SKILL.md](skills/package-scanner-cli/SKILL.md)         | Agent activation rules and workflows                       |
| [skills/package-scanner-cli/README.md](skills/package-scanner-cli/README.md)       | Skill install, runtime model, publish checklist            |
| [skills/package-scanner-cli/reference.md](skills/package-scanner-cli/reference.md) | HTTP endpoints and portable `curl` / Node snippets         |
| [skills/package-scanner-cli/examples.md](skills/package-scanner-cli/examples.md)   | Trigger phrases and example agent behavior                 |

## Repository layout

```text
LICENSE
package.json
pnpm-lock.yaml
tsconfig.json
src/
└── … TypeScript sources (compiled to the skill helper)
skills/
└── package-scanner-cli/
    ├── SKILL.md
    ├── README.md
    ├── examples.md
    ├── reference.md
    └── scripts/
        └── package_scanner.js   # entry; other .js chunks may be emitted by tsc
```

## Notes

- The published skill is portable: it can use raw HTTP calls when the helper script is not available at a repo-relative path.
- TypeScript source lives under `src/`, outside the published skill directory root that users copy.
- The distributed helper is built into `skills/package-scanner-cli/scripts/`. Run `pnpm build` after changing `src/`; it clears old generated `.js` files first.
- PackageScanner itself supports scanning uploaded manifests and lockfiles, package search, and report sharing through its web flow and related integrations.

## Security

Summary: the helper uses only Node.js stdlib; full scans upload selected files you pass to the public API. Never send credentials or `.npmrc`. For details and how to report vulnerabilities, see [SECURITY.md](SECURITY.md).

## Local validation

```bash
pnpm install
pnpm build
pnpm verify:artifacts
npx skills add . --skill package-scanner-cli --list
node skills/package-scanner-cli/scripts/package_scanner.js health
```
