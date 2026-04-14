# Security Policy

## Supported scope

This repository is a public `skills` ecosystem repository for the `package-scanner-cli` skill.

Security fixes are applied to the latest version on the default branch. Older snapshots or private forks are not guaranteed to receive backports.

## What this repository does

- Provides a skill definition for agent-driven PackageScanner usage
- Provides a small Node.js helper script that sends explicit requests to the public PackageScanner HTTP API
- Documents portable fallback patterns using `curl` or inline Node.js

## Data handling expectations

- Full scans may upload a selected lockfile and optionally `package.json` to `https://www.package-scanner.dev/api`
- Single-package lookups send only the package name and optional version
- The helper must not read or transmit `.npmrc`, tokens, environment files, or private registry credentials unless a contributor intentionally changes the code to do so
- The helper now validates analyze inputs and only accepts `package.json` plus supported lockfile basenames; it rejects sensitive filenames such as `.npmrc`, `.env*`, and `credentials.json`

## Security boundaries

This repository does not attempt to:

- prove a package is compromised with certainty
- keep uploaded project metadata private from the PackageScanner service
- scan arbitrary files outside the paths explicitly supplied by the caller

## Reporting a vulnerability

Please do not open a public issue for undisclosed security vulnerabilities.

### GitHub-hosted repositories

Use **Security → Advisories → Report a vulnerability** on this repository so the report stays private until coordinated disclosure.

Include:

- affected file or document
- reproduction steps
- expected impact
- proof of concept if available

Repository maintainers should enable [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on GitHub before promoting this repository broadly.

### If you cannot use GitHub advisories

Contact the repository owners through the security contact or process listed on the hosting platform (for example organization or repository **Security policy**). If none is published yet, add one before wide public distribution.

## Secure contribution rules

- Keep runtime dependencies at zero unless there is a strong justification
- Prefer Node.js standard library APIs
- Add timeouts to all outbound network calls
- Do not expand file collection beyond explicitly provided paths
- Do not add support for sending auth material, registry credentials, or environment files
- Keep documentation aligned with actual data flows
