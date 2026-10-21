#!/bin/sh
# SKH Solutions — Linux launcher:  sh start-server.sh
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Install Node.js (LTS) from https://nodejs.org first."; exit 1; }
( sleep 1.5; xdg-open http://localhost:3000 >/dev/null 2>&1 ) &
node server.js
