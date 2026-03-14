#!/bin/bash
# ============================================================
# bump-version.sh — Iqra Qur'an Reader
# Run this once before pushing to GitHub:
#   sh bump-version.sh
#
# What it does:
#   - Generates a version string from the current timestamp
#   - Updates APP_VERSION in sw.js
#   - That's it. Push normally after.
# ============================================================

VERSION="iqra-v$(date +%Y%m%d-%H%M)"
SW_FILE="sw.js"

# Replace the APP_VERSION line in sw.js
sed -i.bak "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$VERSION'/" "$SW_FILE"
rm -f "$SW_FILE.bak"

echo "✓ Version bumped to: $VERSION"
echo "  Now run: git add -A && git commit -m 'Release $VERSION' && git push"
