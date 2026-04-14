# PackageScanner CLI Examples

## Trigger phrases

- "この `pnpm-lock.yaml` を安全性チェックして"
- "`package.json` の依存関係に危険なものがないか見て"
- "`event-stream@3.3.6` はマルウェア判定されている?"
- "この npm パッケージ、脆弱性や怪しい公開時期がないか調べて"
- "supply-chain risk を CLI で見て"

## Example agent behavior

### Full dependency scan

User request:

```text
Scan this lockfile and package.json for supply-chain issues.
```

Expected behavior:

1. Confirm it is acceptable to upload the selected files to the public PackageScanner service.
2. Prefer the Node.js helper CLI when it exists in the current workspace.
3. Run `analyze` with the lockfile and `package.json`.
4. Report malware count, vulnerability count, metadata alerts, and `analysisId`.

### Single package reputation check

User request:

```text
Is ua-parser-js suspicious?
```

Expected behavior:

1. Run `search --name ua-parser-js`.
2. If the user wants more context, run `metadata` and `vulnerabilities`.
3. Explain the result in plain language.

### Re-open a report

User request:

```text
Summarize analysis an_abc123 again.
```

Expected behavior:

1. Run `report --analysis-id an_abc123`.
2. Summarize the risky packages first.

## Preferred summary shape

```markdown
Scan target: pnpm-lock.yaml + package.json
Verdict: findings detected

Key findings:

- Malware: 1 hit in example-package@1.2.3
- Vulnerabilities: 2 hits affecting lodash@4.17.20
- Metadata: 1 fresh-release alert on suspicious-package@0.0.1

Next action:

- Remove the flagged package and regenerate the lockfile
```
