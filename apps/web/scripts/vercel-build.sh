#!/usr/bin/env bash
# The whole build in one script, run from apps/web by Vercel: install the workspace, bundle the runtime, copy it
# next to the app, build Next. Vercel's Install Command is a no-op so that every step runs here, in one shell.
set -euo pipefail
node -v; pnpm -v
NODE_ENV=development pnpm install --frozen-lockfile  # Vercel builds with NODE_ENV=production, which would make pnpm drop the devDependencies the build needs
pnpm --filter @anesis/runtime build
rm -rf .runtime && mkdir -p .runtime && cp ../../packages/runtime/dist/index.mjs .runtime/index.mjs
next build
