#!/usr/bin/env bash
# repotato launcher — open the feed in a NEW window of the SAME terminal emulator
# the user is currently in. Invoked by the /repotato slash command.
#
# Adapted from the user's mitosis spawn.sh: a /tmp "runner" script sidesteps the
# AppleScript quoting nightmare; $TERM_PROGRAM picks the host emulator so we open
# where the user already is (Ghostty -> Ghostty, iTerm -> iTerm, etc.).
set -euo pipefail

APP_DIR="/Users/manueltoledo/Desktop/repotato"
TITLE="🥔 repotato"

# Where the user invoked /repotato from — i.e. what they're building. Passed to
# the TUI so ask/try can reason about their context.
from_cwd="$PWD"

# Optional mode: `/repotato launch` opens straight into the submit flow.
mode_export=""
[[ "${1:-}" == "launch" ]] && mode_export="export REPOTATO_MODE=launch"

# What the new window runs. NOTE: the X's must be the LAST chars of the template
# — BSD mktemp (macOS) won't substitute them if a suffix like ".sh" follows, and
# then collides with "File exists" on the 2nd run. No extension needed: the file
# is executable via its shebang.
runner="$(mktemp "${TMPDIR:-/tmp}/repotato-run.XXXXXX")"
cat >"$runner" <<RUNNER
#!/usr/bin/env bash
export REPOTATO_FROM_CWD="${from_cwd}"
${mode_export}
cd "${APP_DIR}"
clear
exec npm run --silent dev
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
  try
    set bounds of w to {150, 80, 1150, 1000}
  end try
end tell
APPLESCRIPT
}

# Ghostty has no AppleScript dictionary; open a new window via the macOS app and
# hand it the runner with -e. Best-effort — falls through to manual hint if it
# can't be opened.
launch_ghostty() {
  open -na Ghostty --args --working-directory="${APP_DIR}" -e "${runner}"
}

manual_hint() {
  echo "Couldn't auto-open your terminal (${host:-unknown}). Run it manually:"
  echo "  cd ${APP_DIR} && npm run dev"
}

case "$host" in
  Apple_Terminal) launch_terminal_app ;;
  iTerm.app) launch_iterm "iTerm2" 2>/dev/null || launch_iterm "iTerm" ;;
  ghostty | Ghostty) launch_ghostty || manual_hint ;;
  *)
    # Unknown host: try what's installed, else explain.
    if osascript -e 'tell application "iTerm2" to get version' >/dev/null 2>&1; then
      launch_iterm "iTerm2"
    elif osascript -e 'tell application "Terminal" to get version' >/dev/null 2>&1; then
      launch_terminal_app
    else
      manual_hint
      exit 0
    fi
    ;;
esac

echo "🥔 repotato is opening in a new window."
