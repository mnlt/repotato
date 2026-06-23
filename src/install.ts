import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** `repotato install` — set up the /repotato slash command for this machine.
 *  Writes a portable launcher (runs `npx repotato`) and the Claude Code command,
 *  with this user's own absolute paths — no hardcoded author paths. */
export function runInstall(): void {
  const home = homedir();
  const repotatoDir = join(home, ".repotato");
  const commandsDir = join(home, ".claude", "commands");
  const launcherPath = join(repotatoDir, "launch.sh");

  mkdirSync(repotatoDir, { recursive: true });
  mkdirSync(commandsDir, { recursive: true });

  const template = readFileSync(
    new URL("../skill/launch-template.sh", import.meta.url),
    "utf8",
  );
  writeFileSync(launcherPath, template, { mode: 0o755 });
  chmodSync(launcherPath, 0o755);

  const command = `---
description: Open the repotato feed in a new terminal window
disable-model-invocation: true
allowed-tools: Bash(${launcherPath}:*)
---
!\`${launcherPath}\`

repotato is opening in a new window — browse it while your agent has downtime. Reply with just "🥔".
`;
  writeFileSync(join(commandsDir, "repotato.md"), command);

  console.log("🥔 Installed the /repotato command.");
  console.log("   Type /repotato in Claude Code to open the feed in a new window.");
  if (process.platform !== "darwin") {
    console.log(
      "   Note: auto-opening a window is macOS-only for now — elsewhere just run `npx repotato`.",
    );
  }
}
