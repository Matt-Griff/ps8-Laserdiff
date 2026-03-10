# Import (if it exists) the previous dump of the database

mongod --fork --logpath /var/log/mongod.log --bind_ip_all

until mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    echo "Waiting for MongoDB"
    sleep 1
done

date_regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}$"

if [ -d "/data/dump" ]; then
    for file in /data/dump/*; do
        filename=$(basename "$file")
        if [[ $filename =~ $date_regex ]]; then
            mongorestore --drop --archive="$file"
            echo "Database restored from $file"
            break
        fi
    done
else
    echo "No dump directory found, starting with an empty database."
fi

mongod --shutdown
exec mongd --bind_ip_all