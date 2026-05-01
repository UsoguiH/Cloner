#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install from https://nodejs.org/ then run this again."
  exit 1
fi
exec node serve.cjs
