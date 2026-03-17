#!/usr/bin/env bash
set -e
cd ~/Projects/gatefile

echo "==> Setting up demo plan..."
./scripts/demo-setup.sh

echo "==> Starting VHS recording..."
# VHS needs gatefile on PATH and to start in the right dir
export PATH="$(npm root -g)/.bin:$(pwd)/node_modules/.bin:$PATH"
# Also ensure local build is on PATH
export PATH="$(pwd)/node_modules/.bin:$PATH"
npm link 2>/dev/null || true

# Run from project root so paths work
vhs demo.tape

echo "==> Cleaning up..."
rm -rf .demo

echo "==> Done! demo.gif created"
