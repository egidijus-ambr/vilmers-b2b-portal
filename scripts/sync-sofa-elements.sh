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
echo "1/5 Syncing SofaElements/ ..."
rsync -av --delete \
  "$ADMIN_SOFA/SofaElements/" \
  "$PORTAL_SOFA/SofaElements/"

# ---- 2. Sync Gizmo.tsx ----
echo ""
echo "2/5 Syncing Gizmo.tsx ..."
cp -v "$ADMIN_SOFA/Gizmo.tsx" "$PORTAL_SOFA/Gizmo.tsx"

# ---- 3. Sync utils.tsx ----
echo ""
echo "3/5 Syncing utils.tsx ..."
cp -v "$ADMIN_SOFA/utils.tsx" "$PORTAL_SOFA/utils.tsx"

# ---- 4. Sync SofaDrawingPreview.tsx ----
echo ""
echo "4/5 Syncing SofaDrawingPreview.tsx ..."
cp -v "$ADMIN_SOFA/SofaDrawingPreview.tsx" "$PORTAL_SOFA/SofaDrawingPreview.tsx"

# ---- 5. Sync README.md ----
echo ""
echo "5/5 Syncing README.md ..."
cp -v "$ADMIN_SOFA/README.md" "$PORTAL_SOFA/README.md"

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
