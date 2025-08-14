#!/bin/bash

# Preflight script - ensure latest state before running
# Blocks stale states and ensures up-to-date code

set -e

echo "🚀 Preflight Check"
echo "=================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Fetch latest from all remotes
echo "📥 Fetching latest from all remotes..."
git fetch --all --tags --prune

# Get current status
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "No tags found")

echo "📍 Current branch: $CURRENT_BRANCH"
echo "📍 Current commit: $CURRENT_COMMIT"
echo "📍 Latest tag: $LATEST_TAG"

# Check if we're on a tag
if git describe --exact-match --tags HEAD >/dev/null 2>&1; then
    CURRENT_TAG=$(git describe --exact-match --tags HEAD)
    echo "🏷️  Currently on tag: $CURRENT_TAG"
    
    # Ensure it's the latest tag by semver
    if [ "$CURRENT_TAG" != "$LATEST_TAG" ]; then
        echo "❌ Error: Not on the latest tag"
        echo "   Current: $CURRENT_TAG"
        echo "   Latest:  $LATEST_TAG"
        echo ""
        echo "To fix: git checkout $LATEST_TAG"
        exit 1
    fi
else
    # We're on a branch, check if behind upstream
    UPSTREAM_BRANCH="origin/$CURRENT_BRANCH"
    
    if git rev-parse $UPSTREAM_BRANCH >/dev/null 2>&1; then
        LOCAL_COMMIT=$(git rev-parse HEAD)
        REMOTE_COMMIT=$(git rev-parse $UPSTREAM_BRANCH)
        
        if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
            # Check if we're behind
            if git merge-base --is-ancestor $LOCAL_COMMIT $REMOTE_COMMIT 2>/dev/null; then
                echo "❌ Error: Local branch is behind upstream"
                echo "   Local:  $LOCAL_COMMIT"
                echo "   Remote: $REMOTE_COMMIT"
                echo ""
                echo "To fix: git pull --rebase origin $CURRENT_BRANCH"
                exit 1
            fi
        fi
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
echo "📍 Current ref: $CURRENT_BRANCH@$CURRENT_COMMIT"
echo ""

