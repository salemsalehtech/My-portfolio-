#!/usr/bin/env bash
# build-pdfs.sh — prints every guide in this folder (*.html) to a PDF next to it, using the
# browser already installed on the machine (Edge, else Chrome) in headless mode. The browser
# renders Arabic/RTL and the web fonts exactly like a normal page.
#
# Usage (from the repo root, in Git Bash):   bash docs/guides/build-pdfs.sh
set -euo pipefail
cd "$(dirname "$0")"

BROWSER=""
for candidate in \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Google/Chrome/Application/chrome.exe"; do
  if [ -f "$candidate" ]; then BROWSER="$candidate"; break; fi
done
[ -n "$BROWSER" ] || { echo "No Edge/Chrome found"; exit 1; }

for html in *.html; do
  pdf="${html%.html}.pdf"
  url="file:///$(pwd -W 2>/dev/null || pwd)/$html"
  # --virtual-time-budget gives the page time to load the Google fonts before printing.
  "$BROWSER" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 \
    --print-to-pdf="$(pwd -W 2>/dev/null || pwd)/$pdf" "$url" >/dev/null 2>&1
  echo "built $pdf ($(du -k "$pdf" | cut -f1) KB)"
done
