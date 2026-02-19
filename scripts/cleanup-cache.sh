#!/bin/bash
set -e

# cleanup-cache.sh — Remove stale cached files from the B2B portal.
#
# Targets:
#   .next/cache/images/  — optimized image cache (delete files older than 31 days,
#                          matches next.config minimumCacheTTL: 2678400 seconds)
#   tmp/photo-zips/      — generated ZIP downloads (delete files older than 1 day,
#                          matches CACHE_DURATION_HOURS = 24)
#
# Recommended crontab entries:
#
# Weekly image cache cleanup (Sunday 3:00 AM):
# 0 3 * * 0 /path/to/vilmers-b2b-portal/scripts/cleanup-cache.sh >> /var/log/b2b-cache-cleanup.log 2>&1
#
# Or daily for both image and zip cleanup:
# 0 3 * * * /path/to/vilmers-b2b-portal/scripts/cleanup-cache.sh >> /var/log/b2b-cache-cleanup.log 2>&1

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting cache cleanup for $PROJECT_ROOT"

# --- .next/cache/images/ (files older than 31 days) ---
IMAGE_CACHE_DIR="$PROJECT_ROOT/.next/cache/images"
if [ -d "$IMAGE_CACHE_DIR" ]; then
  COUNT=$(find "$IMAGE_CACHE_DIR" -type f -mtime +31 | wc -l | tr -d ' ')
  find "$IMAGE_CACHE_DIR" -type f -mtime +31 -delete
  log "Image cache: deleted $COUNT file(s) older than 31 days"
else
  log "Image cache: $IMAGE_CACHE_DIR does not exist, skipping"
fi

# --- tmp/photo-zips/ (files older than 1 day) ---
ZIP_CACHE_DIR="$PROJECT_ROOT/tmp/photo-zips"
if [ -d "$ZIP_CACHE_DIR" ]; then
  COUNT=$(find "$ZIP_CACHE_DIR" -type f -mtime +1 | wc -l | tr -d ' ')
  find "$ZIP_CACHE_DIR" -type f -mtime +1 -delete
  log "Photo zips: deleted $COUNT file(s) older than 1 day"
else
  log "Photo zips: $ZIP_CACHE_DIR does not exist, skipping"
fi

log "Cache cleanup complete"
