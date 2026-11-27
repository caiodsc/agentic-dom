#!/bin/sh
# Downloads each app into real-apps/<name> at a fixed commit, so a scan of it gives the same reports every time.
set -e
cd "$(dirname "$0")/.."
while read -r name repo commit; do
  dir="real-apps/$name"
  if [ ! -d "$dir" ]; then
    git init -q "$dir"
    git -C "$dir" fetch -q --depth 1 "https://github.com/$repo.git" "$commit"
    git -C "$dir" checkout -q FETCH_HEAD
    (cd "$dir" && npm ci --ignore-scripts --no-audit --no-fund)
  fi
done <<APPS
atomic-crm marmelab/atomic-crm bfcb138bd549b03fa7c4a8c03c8212b6fd08b8bf
APPS
