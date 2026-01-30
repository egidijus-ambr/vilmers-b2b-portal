#!/bin/bash
# ============================================================
# Sync Sofa Drawing Elements from saas-admin-ui (source of truth)
# to vilmers-b2b-portal (consumer).
#
# Usage: ./scripts/sync-sofa-elements.sh [admin-repo-path]
#
# If no path is provided, defaults to sibling directory:
#   ../saas-admin-ui
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source (admin) repo path
ADMIN_ROOT="${1:-$(cd "$PORTAL_ROOT/../saas-admin-ui" 2>/dev/null && pwd)}"

if [ -z "$ADMIN_ROOT" ] || [ ! -d "$ADMIN_ROOT" ]; then
  echo "Error: Admin repo not found at: ${1:-../saas-admin-ui}"
  echo "Usage: $0 [path-to-saas-admin-ui]"
  exit 1
fi

# Paths
ADMIN_SOFA="$ADMIN_ROOT/src/configurator/SofaDrawingElements"
PORTAL_SOFA="$PORTAL_ROOT/src/configurator/SofaDrawingElements"

# Validate source exists
if [ ! -d "$ADMIN_SOFA" ]; then
  echo "Error: Source directory not found: $ADMIN_SOFA"
  exit 1
fi

# Create destination if it doesn't exist
mkdir -p "$PORTAL_SOFA/SofaElements"

echo "Syncing sofa elements..."
echo "  From: $ADMIN_SOFA"
echo "  To:   $PORTAL_SOFA"
echo ""

# ---- 1. Sync SofaElements/ directory (all files) ----
echo "1/3 Syncing SofaElements/ ..."
rsync -av --delete \
  "$ADMIN_SOFA/SofaElements/" \
  "$PORTAL_SOFA/SofaElements/"

# ---- 2. Sync Gizmo.tsx ----
echo ""
echo "2/3 Syncing Gizmo.tsx ..."
cp -v "$ADMIN_SOFA/Gizmo.tsx" "$PORTAL_SOFA/Gizmo.tsx"

# ---- 3. Sync utils.tsx ----
echo ""
echo "3/3 Syncing utils.tsx ..."
cp -v "$ADMIN_SOFA/utils.tsx" "$PORTAL_SOFA/utils.tsx"

echo ""
echo "Sync complete."
echo ""
echo "NOTE: The synced components use react-konva."
echo "      If not installed, run: yarn add konva react-konva"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test the portal builds: npm run build"
echo "  3. Commit if all looks good"
