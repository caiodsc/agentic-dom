#!/bin/sh
set -e
cd "$(dirname "$0")"
(cd test-app && npm ci --no-audit --no-fund)
npm ci --no-audit --no-fund
npx playwright install chromium
