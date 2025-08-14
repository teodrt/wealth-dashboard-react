#!/bin/bash

# Snapshot script - local crash-proof backup
# Creates timestamped snapshots of all uncommitted work

set -e

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
SNAPSHOT_DIR="snapshots/${TIMESTAMP}"

echo "📸 Creating snapshot: ${SNAPSHOT_DIR}"

# Create snapshot directory
mkdir -p "${SNAPSHOT_DIR}"

# Save uncommitted patch
echo "  📄 Saving uncommitted changes..."
git diff > "${SNAPSHOT_DIR}/uncommitted.patch" 2>/dev/null || echo "No uncommitted changes" > "${SNAPSHOT_DIR}/uncommitted.patch"

# Save staged patch
echo "  📄 Saving staged changes..."
git diff --cached > "${SNAPSHOT_DIR}/staged.patch" 2>/dev/null || echo "No staged changes" > "${SNAPSHOT_DIR}/staged.patch"

# Archive modified tracked files
echo "  📦 Archiving modified files..."
git ls-files -m | tar -czf "${SNAPSHOT_DIR}/changed.tar.gz" -T - 2>/dev/null || echo "No modified files to archive" > "${SNAPSHOT_DIR}/changed.tar.gz"

# Write metadata
echo "  📝 Writing metadata..."
cat > "${SNAPSHOT_DIR}/meta.txt" << EOF
Snapshot created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Branch: $(git rev-parse --abbrev-ref HEAD)
Commit: $(git rev-parse HEAD)
Short commit: $(git rev-parse --short HEAD)
Working directory: $(pwd)
Git status:
$(git status --porcelain)
EOF

# Create a symlink to latest snapshot
rm -f snapshots/latest
ln -sf "${TIMESTAMP}" snapshots/latest

echo "✅ Snapshot created: ${SNAPSHOT_DIR}"
echo "   📄 uncommitted.patch"
echo "   📄 staged.patch"
echo "   📦 changed.tar.gz"
echo "   📝 meta.txt"
echo "   🔗 Latest: snapshots/latest"
