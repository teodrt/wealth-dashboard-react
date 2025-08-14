#!/bin/bash

# Wealth Dashboard v2.52 Preflight Script
# This script ensures the development environment is ready and up-to-date

set -e

echo "🚀 Wealth Dashboard v2.52 Preflight Check"
echo "=========================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get current git status
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "No tags found")
UPSTREAM_BRANCH="origin/$CURRENT_BRANCH"

echo "📍 Current branch: $CURRENT_BRANCH"
echo "📍 Current commit: $CURRENT_COMMIT"
echo "📍 Latest tag: $LATEST_TAG"

# Check if we're behind upstream (for branches)
if [ "$CURRENT_BRANCH" != "HEAD" ]; then
    git fetch origin
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse $UPSTREAM_BRANCH 2>/dev/null || echo "no-upstream")
    
    if [ "$REMOTE_COMMIT" != "no-upstream" ] && [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        echo "⚠️  Warning: Local branch is behind upstream"
        echo "   Local:  $LOCAL_COMMIT"
        echo "   Remote: $REMOTE_COMMIT"
        echo ""
        echo "Consider running: git pull origin $CURRENT_BRANCH"
        echo ""
    fi
fi

# Clear build caches
echo "🧹 Clearing build caches..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true

echo "✅ Caches cleared"

# Check dependencies
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🎯 Preflight check complete!"
echo "📍 Ready to run: npm run dev"
echo "📍 Current version: $CURRENT_COMMIT"
echo ""

