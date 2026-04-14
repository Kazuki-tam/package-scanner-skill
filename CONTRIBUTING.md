# Contributing

Thanks for contributing to this repository.

## Goals

- Keep the skill easy to install with `npx skills add`
- Keep runtime behavior transparent and auditable
- Keep data handling conservative for public OSS usage

## Development principles

- Prefer Node.js standard library APIs over third-party packages
- Keep the helper small and readable
- Make outbound requests explicit and bounded by timeouts
- Do not read or transmit secrets, `.npmrc`, or environment files
- Treat `src/package_scanner.ts` as the source of truth and commit the rebuilt `skills/package-scanner-cli/scripts/package_scanner.js`
- Update docs whenever command behavior or data flow changes

## Local checks

Run these before opening a pull request:

```bash
pnpm install
pnpm build
npx skills add . --skill package-scanner-cli --list
node skills/package-scanner-cli/scripts/package_scanner.js --help
node skills/package-scanner-cli/scripts/package_scanner.js health
```

## Changing request behavior

If a change affects what data is sent to PackageScanner:

- update `README.md`
- update `skills/package-scanner-cli/README.md`
- update `skills/package-scanner-cli/SKILL.md`
- update `SECURITY.md`

## Pull request notes

Please include:

- what changed
- why it changed
- how you tested it
- whether the data handling model changed

## Non-goals

- Adding hidden telemetry
- Adding broad filesystem collection
- Adding credentials support without a strong review and documentation update
