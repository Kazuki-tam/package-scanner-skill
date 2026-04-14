import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function read(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

run("pnpm", ["build"]);

const scriptsStatus = read("git", [
  "status",
  "--porcelain",
  "--",
  "skills/package-scanner-cli/scripts/",
]);

if (scriptsStatus.length > 0) {
  process.stderr.write(
    "Generated files under skills/package-scanner-cli/scripts/ are out of sync. Run `pnpm build` and commit the resulting diff.\n",
  );
  process.exit(1);
}
