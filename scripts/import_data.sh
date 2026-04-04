#!/bin/bash
set -e
date_regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}$"
if [ -d "/data/dump" ]; then
    latest_dump=$(find /data/dump -maxdepth 1 -type f -name "????-??-??_??-??-??*" -printf '%f\n' 2>/dev/null | sort -r | head -n 1)
    if [ -n "$latest_dump" ]; then
        echo "Importing from /data/dump/$latest_dump"
        mongorestore --archive="/data/dump/$latest_dump" --drop
    else
        echo "No valid dump found in /data/dump, starting with an empty database."
    fi
else
    echo "No dump directory found, starting with an empty database."
fi