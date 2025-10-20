#!/bin/bash
#
# Database Restore Script
#
# Restores databases from backup files with:
# - Safety checks (creates backup of current data)
# - Interactive confirmation
# - Automatic decompression
# - Validation
#
# Usage:
#   ./scripts/restore-databases.sh <backup_timestamp>
#
# Example:
#   ./scripts/restore-databases.sh 20250119_140530
#

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATA_DIR="./data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if timestamp provided
if [ -z "$1" ]; then
  log_error "No backup timestamp provided"
  echo ""
  echo "Usage: $0 <backup_timestamp>"
  echo ""
  echo "Available backups:"
  find "$BACKUP_DIR" -type f \( -name "*.db.gz" -o -name "*.tar.gz" \) -exec ls -lh {} \; | \
    awk '{print "  " $9}' | sed 's/.*_\([0-9_]*\)\..*/  \1/' | sort -u
  exit 1
fi

TIMESTAMP=$1

log_info "========================================="
log_info "Database Restore"
log_info "========================================="
log_info "Restore timestamp: $TIMESTAMP"
log_info ""

# Check if backups exist
SQLITE_BACKUP="$BACKUP_DIR/chat_${TIMESTAMP}.db.gz"
LANCEDB_BACKUP="$BACKUP_DIR/lancedb_${TIMESTAMP}.tar.gz"

FOUND_BACKUPS=0

if [ -f "$SQLITE_BACKUP" ]; then
  log_info "Found SQLite backup: $SQLITE_BACKUP"
  FOUND_BACKUPS=$((FOUND_BACKUPS + 1))
fi

if [ -f "$LANCEDB_BACKUP" ]; then
  log_info "Found LanceDB backup: $LANCEDB_BACKUP"
  FOUND_BACKUPS=$((FOUND_BACKUPS + 1))
fi

if [ $FOUND_BACKUPS -eq 0 ]; then
  log_error "No backups found for timestamp: $TIMESTAMP"
  exit 1
fi

# Confirmation
log_warn ""
log_warn "⚠️  WARNING: This will replace current database(s)"
log_warn "Current data will be backed up before restoration"
log_warn ""
read -p "Continue with restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  log_info "Restore cancelled"
  exit 0
fi

# Create safety backup of current data
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SAFETY_BACKUP"

log_info ""
log_info "Creating safety backup of current data..."

if [ -f "$DATA_DIR/chat.db" ]; then
  cp "$DATA_DIR/chat.db" "$SAFETY_BACKUP/chat.db"
  log_info "✅ Backed up current SQLite database"
fi

if [ -d "$DATA_DIR/lancedb" ]; then
  cp -r "$DATA_DIR/lancedb" "$SAFETY_BACKUP/lancedb"
  log_info "✅ Backed up current LanceDB"
fi

# Restore SQLite
if [ -f "$SQLITE_BACKUP" ]; then
  log_info ""
  log_info "Restoring SQLite database..."

  # Decompress
  gunzip -c "$SQLITE_BACKUP" > "$DATA_DIR/chat.db"

  # Verify
  if sqlite3 "$DATA_DIR/chat.db" "SELECT 1" > /dev/null 2>&1; then
    log_info "✅ SQLite database restored and verified"
  else
    log_error "SQLite restoration failed - database is corrupted"
    log_info "Restoring from safety backup..."
    cp "$SAFETY_BACKUP/chat.db" "$DATA_DIR/chat.db"
    exit 1
  fi
fi

# Restore LanceDB
if [ -f "$LANCEDB_BACKUP" ]; then
  log_info ""
  log_info "Restoring LanceDB vector database..."

  # Remove existing LanceDB
  rm -rf "$DATA_DIR/lancedb"

  # Extract backup
  tar -xzf "$LANCEDB_BACKUP" -C "$DATA_DIR"

  log_info "✅ LanceDB restored"
fi

log_info ""
log_info "========================================="
log_info "✅ Restore completed successfully"
log_info "========================================="
log_info "Safety backup location: $SAFETY_BACKUP"
log_info ""

exit 0
