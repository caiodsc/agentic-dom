#!/bin/sh
# A commit, not a branch, so a scan of an app gives the same reports every time.
set -e
cd "$(dirname "$0")/.."
while read -r name repo commit; do
  dir="real-apps/$name"
  [ -d "$dir" ] || git init -q "$dir"
  if [ "$(git -C "$dir" rev-parse -q --verify HEAD)" != "$commit" ]; then
    git -C "$dir" fetch -q --depth 1 "https://github.com/$repo.git" "$commit"
    git -C "$dir" checkout -q FETCH_HEAD
  fi
done <<APPS
cal.com calcom/cal.com ae027bb70e694e2d2c44569f398d6cbcee0389b1
documenso documenso/documenso 3cfdf7f7648117846d7a78b9b37be19641ba8e0d
shadcn-admin satnaing/shadcn-admin 76b0248cb6a1fa6ab60c6de80a2f242cf2b3878f
APPS
