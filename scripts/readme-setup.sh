#!/bin/sh
# Installs the packed plugin in new npm projects, with the README's config files as written, and expects the README demo
# to fail lint with the plugin's reports. Pass "legacy" to check the ESLint 8 .eslintrc setup.
set -eu

repo=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
tarball=$(cd "$repo" && npm pack --silent --pack-destination "$work")

# The first fenced block of the given language after the README line that starts with the given text.
block() {
  awk -v start="$1" -v fence="\`\`\`$2" 'index($0, start) == 1 { found = 1 } found && $0 == fence { inside = 1; next } inside && $0 == "```" { exit } inside' "$repo/README.md"
}

cd "$work"
npm init -y > /dev/null
mkdir src
cp "$repo"/scripts/readme-demo/before/*.jsx src/

if [ "${1:-}" = legacy ]; then
  npm install --silent -D eslint@8 "./$tarball"
  block '**ESLint 8 with `.eslintrc`.**' json > .eslintrc.json
  lint="npx eslint --ext .jsx src"
else
  npm install --silent -D eslint "./$tarball"
  block '## Quick start' js > config.tmp
  mv config.tmp "$(head -n 1 config.tmp | sed 's#^// ##')"
  lint="npx eslint src"
fi

status=0
$lint > out.txt || status=$?
cat out.txt
if [ "$status" -ne 1 ] || ! grep -q 'agentic-dom/' out.txt; then
  echo "Expected the README setup to report the demo with agentic-dom rules (exit $status)." >&2
  exit 1
fi
