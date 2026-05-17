#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${DEVCENTR_APP:-$ROOT/../devcentr/app}"
SDL="$ROOT/catalog/advisor.sdl"
OUT="$ROOT/catalog/advisor.json"
cd "$APP"
dub run --config=compile-catalog -- "$SDL" "$OUT"
