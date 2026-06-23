import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DIR = join(homedir(), ".repotato");
const FILE = join(DIR, "install_id");

/** A stable per-install uuid (persisted in ~/.repotato/install_id). Used as the
 *  users.install_id key for telemetry / future feed prioritization. */
export function getInstallId(): string {
  try {
    const id = readFileSync(FILE, "utf8").trim();
    if (id) return id;
  } catch {
    /* create below */
  }
  const id = randomUUID();
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE, id, { mode: 0o600 });
  } catch {
    /* non-fatal */
  }
  return id;
}
