# PackageScanner CLI Reference

## Path contexts

- **Developing this repository:** examples use `node skills/package-scanner-cli/scripts/package_scanner.js` from the repo root.
- **Installed skill:** from the skill folder (where `SKILL.md` lives), use `node scripts/package_scanner.js`. If `pnpm build` emitted additional modules under `scripts/`, ship them alongside the entry file.
- **Portable use:** prefer `curl` or inline Node.js below when the helper path is unknown.

## Hosted API Base URL

```text
https://www.package-scanner.dev/api
```

## Portability Rule

Public skill installs are copied into agent-specific directories, so do not assume the helper script is available at a repo-relative path in the current workspace.

- If `skills/package-scanner-cli/scripts/package_scanner.js` exists in the current workspace, you may use it.
- Otherwise, use the portable HTTP examples below.

## Helper CLI

```bash
node skills/package-scanner-cli/scripts/package_scanner.js --help
```

## Commands

### Analyze a lockfile or manifest

```bash
node skills/package-scanner-cli/scripts/package_scanner.js analyze \
  --lockfile pnpm-lock.yaml \
  --package-json package.json \
  --metadata-check
```

### Search known malware hits

```bash
curl -fsS "https://www.package-scanner.dev/api/malware-db/search?name=event-stream&version=3.3.6"
```

### Inspect metadata signals

```bash
curl -fsS "https://www.package-scanner.dev/api/package/metadata?name=react&version=19.1.1"
```

### Inspect published vulnerabilities

```bash
curl -fsS "https://www.package-scanner.dev/api/package/vulnerabilities?name=lodash&version=4.17.20"
```

### Re-open an existing report

```bash
curl -fsS "https://www.package-scanner.dev/api/report/an_example123"
```

### Analyze a lockfile or manifest without the helper script

```bash
node - <<'JS'
const fs = require("node:fs");
const https = require("node:https");

const payload = JSON.stringify({
  lockfileContent: fs.readFileSync("pnpm-lock.yaml", "utf8"),
  manager: "pnpm",
  packageJsonContent: fs.readFileSync("package.json", "utf8"),
  options: { enableMetadataCheck: true },
});

const req = https.request(
  "https://www.package-scanner.dev/api/ci/analyze",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      Accept: "application/json",
    },
  },
  (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      process.stdout.write(Buffer.concat(chunks).toString("utf8"));
    });
  }
);

req.setTimeout(120000, () => req.destroy(new Error("Request timed out")));
req.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
req.write(payload);
req.end();
JS
```

## Raw HTTP Endpoints

- `GET /health`
- `GET /malware-db/search?name=<pkg>&version=<ver>`
- `GET /package/metadata?name=<pkg>&version=<ver>`
- `GET /package/vulnerabilities?name=<pkg>&version=<ver>`
- `GET /report/<analysisId>`
- `POST /ci/analyze`

## `POST /ci/analyze` body

```json
{
  "lockfileContent": "...optional...",
  "manager": "npm",
  "packageJsonContent": "...optional...",
  "options": {
    "enableMetadataCheck": true
  }
}
```

Rules:

- At least one of `lockfileContent` or `packageJsonContent` is required.
- `manager` is required when `lockfileContent` is present.
- `enableMetadataCheck` requires `packageJsonContent`.
- Helper CLI validation accepts only `package.json` for `--package-json`.
- Helper CLI validation accepts only `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock` for `--lockfile`.
- Helper CLI validation rejects sensitive filenames such as `.npmrc`, `.env*`, and `credentials.json`.
- `bun.lockb` is not supported.

## Fallback curl example

```bash
curl -fsS "https://www.package-scanner.dev/api/malware-db/search?name=event-stream&version=3.3.6"
```

## Repo-local helper examples

```bash
node skills/package-scanner-cli/scripts/package_scanner.js search --name event-stream --version 3.3.6
node skills/package-scanner-cli/scripts/package_scanner.js metadata --name react --version 19.1.1
node skills/package-scanner-cli/scripts/package_scanner.js vulnerabilities --name lodash --version 4.17.20
```
