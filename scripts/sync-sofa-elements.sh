#!/bin/bash
# ============================================================
# Sync Sofa Drawing Elements from saas-admin-ui (source of truth)
# to vilmers-b2b-portal (consumer).
#
# Usage: ./scripts/sync-sofa-elements.sh [--force] [admin-repo-path]
#
# If no path is provided, defaults to sibling directory:
#   ../saas-admin-ui
#
# SAFETY: this script has no merge logic. It overwrites the portal's copy
# with 'rsync -av --delete' on SofaElements/ plus a plain 'cp' of the four
# top-level files, so ANY uncommitted change under
# src/configurator/SofaDrawingElements is destroyed with no way to recover
# it. Before copying anything it therefore runs 'git status' on that
# directory and aborts if it is dirty.
#
# Escape hatch (use only if you know the local edits are disposable):
#   --force        skip the uncommitted-changes check
#   SYNC_FORCE=1   same thing, via the environment
# Both print a loud warning first. Your local edits WILL be overwritten.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---- Argument parsing ----
# --force may appear anywhere; the first non-option argument is the admin path.
FORCE="${SYNC_FORCE:-0}"
ADMIN_ARG=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)
      FORCE=1
      ;;
    -h|--help)
      echo "Usage: $0 [--force] [path-to-saas-admin-ui]"
      exit 0
      ;;
    -*)
      echo "Error: unknown option: $1" >&2
      echo "Usage: $0 [--force] [path-to-saas-admin-ui]" >&2
      exit 1
      ;;
    *)
      if [ -z "$ADMIN_ARG" ]; then
        ADMIN_ARG="$1"
      else
        echo "Error: unexpected extra argument: $1" >&2
        echo "Usage: $0 [--force] [path-to-saas-admin-ui]" >&2
        exit 1
      fi
      ;;
  esac
  shift
done

# Source (admin) repo path
ADMIN_ROOT="${ADMIN_ARG:-$(cd "$PORTAL_ROOT/../saas-admin-ui" 2>/dev/null && pwd || true)}"

if [ -z "$ADMIN_ROOT" ] || [ ! -d "$ADMIN_ROOT" ]; then
  echo "Error: Admin repo not found at: ${ADMIN_ARG:-../saas-admin-ui}"
  echo "Usage: $0 [--force] [path-to-saas-admin-ui]"
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

# Path relative to the portal repo root, for git and for messages
REL_SOFA="src/configurator/SofaDrawingElements"

# ---- 0. Pre-flight: refuse to clobber uncommitted work ----
# Everything below this point is a one-way overwrite of $PORTAL_SOFA.
# If git is unavailable or the portal is not a repo we warn and continue
# rather than hard-failing: the check is a safety net, not a dependency.
if [ -n "$FORCE" ] && [ "$FORCE" != "0" ]; then
  echo "WARNING: --force / SYNC_FORCE=1 given -- skipping the uncommitted-changes check." >&2
  echo "WARNING: any local edits under $REL_SOFA will be OVERWRITTEN and are NOT recoverable." >&2
  echo "" >&2
elif ! command -v git >/dev/null 2>&1; then
  echo "Warning: 'git' not found -- cannot check $REL_SOFA for uncommitted changes."
  echo "         Continuing anyway; local edits there may be overwritten."
  echo ""
elif ! git -C "$PORTAL_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Warning: $PORTAL_ROOT is not a git repository -- cannot check for uncommitted changes."
  echo "         Continuing anyway; local edits under $REL_SOFA may be overwritten."
  echo ""
else
  echo "0/5 Checking $REL_SOFA for uncommitted changes ..."
  # --untracked-files=all so brand-new modules inside SofaElements/ are seen:
  # those are the ones 'rsync --delete' removes with nothing in git to restore.
  DIRTY=""
  if ! DIRTY="$(git -C "$PORTAL_ROOT" status --porcelain --untracked-files=all -- "$REL_SOFA" 2>/dev/null)"; then
    echo "Warning: 'git status' failed -- cannot check $REL_SOFA for uncommitted changes."
    echo "         Continuing anyway; local edits there may be overwritten."
    echo ""
  elif [ -n "$DIRTY" ]; then
    {
      echo ""
      echo "ERROR: aborting -- the portal has uncommitted changes in $REL_SOFA:"
      echo ""
      echo "$DIRTY" | sed 's/^/    /'
      echo ""
      echo "  This sync would OVERWRITE them. It has no merge logic: it runs"
      echo "  'rsync -av --delete' over SofaElements/ and plain 'cp' over"
      echo "  Gizmo.tsx, utils.tsx, SofaDrawingPreview.tsx and README.md."
      echo "  Modified files would be reset to the admin copy, and untracked"
      echo "  files inside SofaElements/ would be DELETED outright -- git has"
      echo "  no copy of those, so that work would be gone for good."
      echo ""
      echo "  Commit or stash first, e.g.:"
      echo "    git -C \"$PORTAL_ROOT\" add $REL_SOFA && git -C \"$PORTAL_ROOT\" commit -m 'wip: sofa elements'"
      echo "    git -C \"$PORTAL_ROOT\" stash push -u -- $REL_SOFA"
      echo ""
      echo "  If the local edits really are disposable, re-run with --force"
      echo "  (or SYNC_FORCE=1) to overwrite them anyway."
      echo ""
    } >&2
    exit 1
  else
    echo "    Clean -- nothing uncommitted, safe to overwrite."
    echo ""
  fi
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
