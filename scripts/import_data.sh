#!/bin/bash

set -e

date_regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}$"
if [ -d "/data/dump" ]; then
    latest_dump=$(ls -1 /data/dump | grep -E "$date_regex" | sort -r | head -n 1)
    if [ -n "$latest_dump" ]; then
        echo "Importing from /data/dump/$latest_dump"
        mongorestore --archive="/data/dump/$latest_dump" --drop
    else
        echo "No valid dump found in /data/dump, starting with an empty database."
    fi
else
    echo "No dump directory found, starting with an empty database."
fi