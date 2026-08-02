#!/usr/bin/env bash
# Preview the site locally, exactly as GitHub Pages will serve it.
#
#   ./serve.sh          -> http://localhost:8000
#   ./serve.sh 9000     -> http://localhost:9000
#
# Root-absolute paths (/brand.css, /edit.js) only resolve when the site is
# served from its root, which is why opening an .html file directly in a
# browser renders it unstyled. Always preview through this.
#
# Also reachable from your phone or the lecture-room machine on the same
# Wi-Fi via the LAN address printed below — useful for checking a deck on
# the projector before class.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8000}"

ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
echo "  site      → http://localhost:${PORT}"
echo "  template  → http://localhost:${PORT}/teaching/_template/"
echo "  CV        → http://localhost:${PORT}/cv/"
[ -n "$ip" ] && echo "  this LAN  → http://${ip}:${PORT}   (phone / projector)"
echo "  Ctrl-C to stop"
echo
exec python3 -m http.server "$PORT" --bind 0.0.0.0
