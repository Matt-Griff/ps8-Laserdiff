# Export the database every 24 hours
#!/bin/bash
while true; do
    DATE=$(date +%Y-%m-%d_%H-%M-%S)
    docker exec mongo_database mongodump --archive="/data/dump/$DATE"
    echo "Exported to /data/dump/$DATE"
    sleep 86400
done