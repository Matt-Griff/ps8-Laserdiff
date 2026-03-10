#!/bin/bash
set -e
# Export the database every 24 hours

DUMP_DIR="$(dirname "$0")/../dump"

mkdir -p "$DUMP_DIR"

while true; do
    DATE=$(date +%Y-%m-%d_%H-%M-%S)
    echo "Starting export at $DATE"

    # Check if the dump folder has too many dumps and remove the oldest one if necessary
    if [ "$(ls -1 "$DUMP_DIR" | wc -l)" -ge 5 ]; then
        oldest_dump=$(ls -1 "$DUMP_DIR" | sort | head -n 1)
        echo "Removing oldest dump: $oldest_dump"
        rm "$DUMP_DIR/$oldest_dump"
    fi

    if docker exec mongo_database mongodump --archive="/data/dump/$DATE"; then
        echo "Exported to $DUMP_DIR/$DATE"
    else
        echo "mongodump failed at $DATE, retrying in 60 seconds..." >&2
        sleep 60
        continue
    fi
    sleep 86400
done