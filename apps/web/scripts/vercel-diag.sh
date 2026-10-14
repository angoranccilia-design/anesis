#!/usr/bin/env bash
# Build diagnostic for Vercel: runs the real build steps and publishes their log as a static page (out/build.log),
# so a failing build can be read when the dashboard logs are not reachable. Never fails the deployment itself.
mkdir -p out
{
  set -x
  node -v; pnpm -v
  env | grep -E '^(NODE_ENV|CI|VERCEL_ENV|ENABLE_EXPERIMENTAL_COREPACK|PNPM_HOME|COREPACK_HOME)=' || true
  pwd; ls ../..
  pnpm install --frozen-lockfile
  pnpm --filter @anesis/runtime build
  rm -rf .runtime && mkdir -p .runtime && cp ../../packages/runtime/dist/index.mjs .runtime/index.mjs
  next build
  echo "build-ok"
} > out/build.log 2>&1
echo "exit=$?" >> out/build.log
tail -c 200000 out/build.log > out/tail.log
true
