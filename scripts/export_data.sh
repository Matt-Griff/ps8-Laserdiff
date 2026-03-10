#!/bin/bash
# Export the database every 24 hours
while true; do
    DATE=$(date +%Y-%m-%d_%H-%M-%S)
    if [ ! -d "/data/dump" ]; then
        mkdir -p /data/dump
    fi
    docker exec mongo_database mongodump --archive="/data/dump/$DATE"
    echo "Exported to /data/dump/$DATE"
    sleep 86400
done