#!/bin/sh
set -e
cd "$(dirname "$0")"
COMMIT=bfcb138bd549b03fa7c4a8c03c8212b6fd08b8bf
if [ ! -d app ]; then
  git init -q app
  git -C app fetch -q --depth 1 https://github.com/marmelab/atomic-crm.git "$COMMIT"
  git -C app checkout -q FETCH_HEAD
  git -C app apply ../patches/common.patch
  git -C app -c user.name=bench -c user.email=bench@localhost commit -qam "bench: common"
fi
(cd app && HUSKY=0 npm ci --no-audit --no-fund)
npm ci --no-audit --no-fund
npx playwright install chromium
