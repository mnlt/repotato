import { readFileSync } from "node:fs";

// Read the running CLI version from package.json (shipped at the package root).
// Works in dev (src/version.ts) and built (dist/version.js): ../package.json.
let version = "0.0.0";
try {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version?: string };
  version = pkg.version ?? "0.0.0";
} catch {
  /* fall back to 0.0.0 */
}

export const VERSION = version;
