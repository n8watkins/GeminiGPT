#!/bin/bash
#
# Database Backup Script
#
# Backs up both SQLite and LanceDB databases with:
# - Timestamped backups
# - Compression
# - Retention policy (keeps last 7 days)
# - Error handling
# - Logging
#
# Usage:
#   ./scripts/backup-databases.sh
#
# For automated backups, add to crontab:
#   0 2 * * * /path/to/backup-databases.sh >> /var/log/backup.log 2>&1
#

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log_info "========================================="
log_info "Database Backup Started"
log_info "========================================="
log_info "Backup directory: $BACKUP_DIR"
log_info "Retention: $RETENTION_DAYS days"
log_info ""

# Backup SQLite database
SQLITE_DB="./data/chat.db"
if [ -f "$SQLITE_DB" ]; then
  log_info "Backing up SQLite database..."

  SQLITE_BACKUP="$BACKUP_DIR/chat_${TIMESTAMP}.db"

  # Use SQLite's .backup command for safe backup (handles WAL mode)
  sqlite3 "$SQLITE_DB" ".backup '$SQLITE_BACKUP'"

  # Compress backup
  gzip "$SQLITE_BACKUP"
  SQLITE_BACKUP="${SQLITE_BACKUP}.gz"

  # Get backup size
  BACKUP_SIZE=$(du -h "$SQLITE_BACKUP" | cut -f1)

  log_info "✅ SQLite backup created: $SQLITE_BACKUP ($BACKUP_SIZE)"
else
  log_warn "SQLite database not found at $SQLITE_DB"
fi

# Backup LanceDB vector database
LANCEDB_DIR="./data/lancedb"
if [ -d "$LANCEDB_DIR" ]; then
  log_info "Backing up LanceDB vector database..."

  LANCEDB_BACKUP="$BACKUP_DIR/lancedb_${TIMESTAMP}.tar.gz"

  # Create compressed archive
  tar -czf "$LANCEDB_BACKUP" -C ./data lancedb

  # Get backup size
  BACKUP_SIZE=$(du -h "$LANCEDB_BACKUP" | cut -f1)

  log_info "✅ LanceDB backup created: $LANCEDB_BACKUP ($BACKUP_SIZE)"
else
  log_warn "LanceDB directory not found at $LANCEDB_DIR"
fi

# Remove old backups (retention policy)
log_info ""
log_info "Applying retention policy (keeping last $RETENTION_DAYS days)..."

# Count files before cleanup
BEFORE_COUNT=$(find "$BACKUP_DIR" -type f \( -name "*.db.gz" -o -name "*.tar.gz" \) | wc -l)

# Remove old SQLite backups
find "$BACKUP_DIR" -name "chat_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete

# Remove old LanceDB backups
find "$BACKUP_DIR" -name "lancedb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Count files after cleanup
AFTER_COUNT=$(find "$BACKUP_DIR" -type f \( -name "*.db.gz" -o -name "*.tar.gz" \) | wc -l)
REMOVED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

if [ $REMOVED_COUNT -gt 0 ]; then
  log_info "Removed $REMOVED_COUNT old backup(s)"
else
  log_info "No old backups to remove"
fi

# Display backup summary
log_info ""
log_info "========================================="
log_info "Backup Summary"
log_info "========================================="

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -type f \( -name "*.db.gz" -o -name "*.tar.gz" \) | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_info "Total backups: $TOTAL_BACKUPS"
log_info "Total size: $TOTAL_SIZE"
log_info "Location: $BACKUP_DIR"

# List recent backups
log_info ""
log_info "Recent backups:"
find "$BACKUP_DIR" -type f \( -name "*.db.gz" -o -name "*.tar.gz" \) -mtime -7 -exec ls -lh {} \; | \
  awk '{print "  - " $9 " (" $5 ")"}'

log_info ""
log_info "✅ Backup completed successfully"
log_info "========================================="

exit 0
