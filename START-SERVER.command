#!/bin/bash
# SKH Solutions — Mac launcher (double-click in Finder)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""; echo "  Node.js is not installed. Download the LTS version from https://nodejs.org , install it, then run this again."; echo ""
  open https://nodejs.org; read -p "Press Enter to close"; exit 1
fi
(sleep 1.5; open http://localhost:3000) &
node server.js
