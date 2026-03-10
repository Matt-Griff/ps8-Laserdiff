#!/bin/bash
set -e
# Export the database every 24 hours

DUMP_DIR="$(dirname "$0")/../services/dump"

mkdir -p "$DUMP_DIR"

while true; do
    DATE=$(date +%Y-%m-%d_%H-%M-%S)
    echo "Starting export at $DATE"

    if docker exec mongo_database mongodump --archive="/data/dump/$DATE"; then
        echo "Exported to $DUMP_DIR/$DATE"
    else
        echo "mongodump failed at $DATE, retrying in 60 seconds..." >&2
        sleep 60
        continue
    fi
    sleep 86400
done