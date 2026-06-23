#!/usr/bin/env bash
# Portable repotato launcher (written to ~/.repotato/launch.sh by `repotato
# install`). Opens a NEW window in the user's terminal running `npx repotato`,
# so the feed runs alongside whatever the agent is doing. macOS only for the
# auto-open; elsewhere it prints how to run it.
set -euo pipefail

TITLE="🥔 repotato"
from_cwd="$PWD"

runner="$(mktemp "${TMPDIR:-/tmp}/repotato-run.XXXXXX")"
cat >"$runner" <<RUNNER
#!/usr/bin/env bash
export REPOTATO_FROM_CWD="${from_cwd}"
clear
exec npx --yes repotato
RUNNER
chmod +x "$runner"

host="${TERM_PROGRAM:-}"

launch_terminal_app() {
  osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "${runner}"
  set custom title of selected tab of the front window to "${TITLE}"
  try
    set number of columns of front window to 92
    set number of rows of front window to 48
  end try
end tell
APPLESCRIPT
}

launch_iterm() {
  local app="$1"
  osascript <<APPLESCRIPT
tell application "${app}"
  activate
  set w to (create window with default profile)
  tell current session of w
    set name to "${TITLE}"
    write text "${runner}"
  end tell
end tell
APPLESCRIPT
}

launch_ghostty() {
  open -na Ghostty --args -e "${runner}"
}

manual_hint() {
  echo "Couldn't auto-open a new window (${host:-unknown}). Run it yourself: npx repotato"
}

case "$host" in
  Apple_Terminal) launch_terminal_app ;;
  iTerm.app) launch_iterm "iTerm2" 2>/dev/null || launch_iterm "iTerm" ;;
  ghostty | Ghostty) launch_ghostty || manual_hint ;;
  *)
    if command -v osascript >/dev/null 2>&1 &&
      osascript -e 'tell application "iTerm2" to get version' >/dev/null 2>&1; then
      launch_iterm "iTerm2"
    elif command -v osascript >/dev/null 2>&1; then
      launch_terminal_app
    else
      manual_hint
    fi
    ;;
esac

echo "🥔 repotato is opening in a new window."
