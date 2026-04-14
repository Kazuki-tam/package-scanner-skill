# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Repository purpose

Public `skills` ecosystem repository that ships the `package-scanner-cli` skill. The skill lets coding agents call the public PackageScanner HTTP API (`https://www.package-scanner.dev/api`) to scan npm manifests/lockfiles, search for malware history, inspect registry metadata, and check vulnerabilities.

## Dev environment

- Use a recent active-LTS Node (Node 20+ recommended; TypeScript target is `ES2022`).
- Enable Corepack before installing so pnpm resolves to the pinned version in `package.json` (`packageManager: pnpm@10.33.0`):

  ```bash
  corepack enable
  pnpm install
  ```

- The built helper at `skills/package-scanner-cli/scripts/package_scanner.js` is **committed** and is what ships to skill consumers — always keep it in sync with `src/` (see Architecture).
- Consumer-facing surfaces that must stay aligned with behavior changes: `README.md`, `skills/package-scanner-cli/README.md`, `skills/package-scanner-cli/SKILL.md`, `SECURITY.md`.

## Common commands

Package manager is **pnpm 10.33** (see `packageManager` in `package.json`).

```bash
pnpm install           # install dev deps
pnpm build             # tsc: compiles src/*.ts -> skills/package-scanner-cli/scripts/*.js
pnpm typecheck         # tsc without emit
pnpm lint              # oxlint
pnpm lint:fix          # oxlint --fix
pnpm format            # oxfmt (write)
pnpm format:check      # oxfmt --check
pnpm test              # vitest run
pnpm test:watch        # vitest (watch)
```

Run a single vitest test file or name:

```bash
pnpm vitest run path/to/file.test.ts
pnpm vitest run -t "test name pattern"
```

Exercise the built helper locally:

```bash
node skills/package-scanner-cli/scripts/package_scanner.js --help
node skills/package-scanner-cli/scripts/package_scanner.js health
npx skills add . --skill package-scanner-cli --list
```

## Testing discipline

- Default pre-PR validation: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Run **all** of these — there is no bundled `pnpm check` script.
- If you change TypeScript under `src/`, always re-run `pnpm build` and commit the regenerated `skills/package-scanner-cli/scripts/package_scanner.js`; never hand-edit the built output.
- `@vitest/coverage-v8` is installed — run `pnpm vitest run --coverage` when you change branching logic, error handling, the CLI dispatch table, or `createAnalyzePayload` validation rules.
- Prefer focused tests via `pnpm vitest run -t "<name>"` while iterating; add or update tests in `tests/package_scanner.test.ts` whenever public CLI behavior, validation rules, or outbound request shape change. Use the `contextOverrides` seam rather than network mocks.

## Pull requests

- Keep each PR focused on one user-visible change or one maintenance concern.
- Before opening a PR, run the Testing-discipline checklist above and also smoke-test the shipped artifact:

  ```bash
  node skills/package-scanner-cli/scripts/package_scanner.js --help
  node skills/package-scanner-cli/scripts/package_scanner.js health
  npx skills add . --skill package-scanner-cli --list
  ```

- Review the diff of `skills/package-scanner-cli/scripts/package_scanner.js` carefully and confirm it is generated **only** from the current `src/` changes (no stray diffs from a dirty local tree or a different tsc version).
- If the change alters request behavior / data sent to the API, update `README.md`, `skills/package-scanner-cli/README.md`, `skills/package-scanner-cli/SKILL.md`, and `SECURITY.md` in the same PR (see `CONTRIBUTING.md` → "Changing request behavior").
- In the PR description include: what changed, why, how it was tested, and whether the data-handling model changed.

## Architecture

Two-layer layout: **TypeScript source** lives outside the published skill; the **distributed artifact** lives inside it.

- `src/package_scanner.ts` — source of truth. Single-file CLI: `parseArgv` → `executeCommand` dispatches a command map (`health`, `search`, `metadata`, `vulnerabilities`, `report`, `analyze`) to `buildUrl` + `requestJson` (Node stdlib `http`/`https` only, no fetch/axios) and prints JSON via `printJson`.
- `skills/package-scanner-cli/scripts/package_scanner.js` — **built output** of `tsc` (see `tsconfig.json` `rootDir`/`outDir`). This file is committed and shipped with the skill. Rebuild with `pnpm build` whenever `src/` changes and commit the regenerated JS (per `CONTRIBUTING.md`).
- `skills/package-scanner-cli/{SKILL.md,README.md,examples.md,reference.md}` — the installable skill payload. `SKILL.md` frontmatter defines the skill's `name`/`description` used by consuming agents.

`executeCommand` accepts injected `readText` / `requestJson` / `writeStdout` via `contextOverrides` — this is the seam for unit tests (vitest). Keep that injection surface intact when adding commands.

Analyze-payload rules enforced in `createAnalyzePayload` (see `src/package_scanner.ts`):

- Supported lockfiles only: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`. `bun.lockb` is explicitly rejected.
- Manager is inferred from lockfile basename; can be overridden with `--manager`.
- `--metadata-check` requires `--package-json`.

## Project conventions & guardrails

From `CONTRIBUTING.md` / `SECURITY.md` / `SKILL.md` — these shape what you can and cannot add:

- **Zero runtime dependencies.** Helper must use only Node.js stdlib. Do not introduce runtime packages; dev-only tools (oxlint, oxfmt, vitest, typescript, @types/node) are the only dependencies.
- **Never read or transmit** `.npmrc`, auth tokens, env files, or registry credentials. Only operate on files explicitly passed via flags — no recursive workspace collection.
- All outbound requests must have explicit, bounded timeouts (default 120s via `--timeout`).
- `src/package_scanner.ts` is the source of truth; the built JS in `skills/.../scripts/` **must** be rebuilt and committed together.
- When changing request behavior / data sent to the API, update all of: `README.md`, `skills/package-scanner-cli/README.md`, `skills/package-scanner-cli/SKILL.md`, `SECURITY.md`.
- Lint/format ignore the built `skills/package-scanner-cli/scripts/` directory (see `.oxlintrc.json`, `.oxfmtrc.json`) — don't hand-edit files there.

## Style

- oxfmt: 2-space indent, LF, double quotes, semicolons, trailing commas, 100 col.
- TS: `strict: true`, target ES2022, CommonJS module (Node `require.main === module` entrypoint is used).
