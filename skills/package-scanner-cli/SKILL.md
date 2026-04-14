---
name: package-scanner-cli
description: Scan npm dependencies through the public PackageScanner HTTP API. Prefer the local Node.js helper script when it exists in the current workspace, otherwise use raw HTTP calls. Use when the user asks to inspect package.json, package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock, suspicious npm packages, supply-chain risk, malware hits, registry metadata, or dependency vulnerabilities.
---

# PackageScanner CLI

## Purpose

Use this skill for dependency security checks when the agent should work through shell commands and the public PackageScanner HTTP API, not MCP.

## Quick Start

1. Use `analyze` for full manifest or lockfile scans.
2. Use `search`, `metadata`, or `vulnerabilities` for a single package investigation.
3. Prefer lockfile analysis over `package.json` analysis when a supported lockfile exists.
4. If the current workspace contains `skills/package-scanner-cli/scripts/package_scanner.js`, prefer that helper for local development of this skill repository.
5. If the helper script is not present in the current workspace, use the raw HTTP patterns in [reference.md](reference.md). Do not assume a repo-relative helper path exists after public installation.

## Commands

### Full scan in this repository

```bash
node skills/package-scanner-cli/scripts/package_scanner.js analyze --lockfile pnpm-lock.yaml --package-json package.json --metadata-check
```

### Single package checks in this repository

```bash
node skills/package-scanner-cli/scripts/package_scanner.js search --name event-stream --version 3.3.6
node skills/package-scanner-cli/scripts/package_scanner.js metadata --name react --version 19.1.1
node skills/package-scanner-cli/scripts/package_scanner.js vulnerabilities --name lodash --version 4.17.20
```

## Workflow

### 1. Choose the smallest command

- `analyze`: scan `package.json` and/or a lockfile
- `search`: check known malware hits for a package name or version
- `metadata`: inspect release freshness, license, and risk alerts
- `vulnerabilities`: inspect published vulnerability hits
- `report`: re-open an existing `analysisId`
- `health`: verify the hosted API is reachable

### 2. Input rules

- Supported lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`
- Do not use `bun.lockb`
- Pass `--metadata-check` only when `package.json` is available
- For a full dependency scan, only send files after confirming it is acceptable to upload the manifest or lockfile to the public PackageScanner service

### 3. Reporting rules

Always summarize:

- What was scanned
- Whether malware hits were found
- Whether vulnerability hits were found
- Whether metadata alerts were found
- The most important risky package names and versions
- The `analysisId` when `analyze` returned one

### 4. Execution rules

- First choice for this repository: use `scripts/package_scanner.js`
- First choice for arbitrary public installations: use the raw HTTP examples in [reference.md](reference.md)
- For single-package lookups, prefer `curl` because it avoids creating temporary files
- For full scans without the helper script, use a short inline Node.js snippet that reads the local lockfile and/or `package.json` and posts JSON to `POST /ci/analyze`

## Guardrails

- The hosted API is public. If the repository looks sensitive, confirm before sending private manifests or lockfiles.
- Never send `.npmrc`, auth tokens, environment files, or registry credentials.
- Treat the output as a strong signal, not irreversible proof of compromise.
- Do not claim a package is compromised unless the response actually contains malware or vulnerability findings.
- If the helper script is unavailable, fall back to the raw HTTP examples in [reference.md](reference.md).
- For installation and extraction guidance, see [README.md](README.md). For example prompts, see [examples.md](examples.md).
