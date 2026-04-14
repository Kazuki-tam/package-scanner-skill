import { readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const scriptsDirectory = path.resolve(process.cwd(), "skills/package-scanner-cli/scripts");

for (const entry of readdirSync(scriptsDirectory)) {
  if (entry.endsWith(".js")) {
    unlinkSync(path.join(scriptsDirectory, entry));
  }
}
