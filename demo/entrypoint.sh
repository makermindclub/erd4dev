#!/bin/sh
set -eu

export SESSION_DRIVER=file
php artisan config:clear
mkdir -p /app/database /app/blueprints
mkdir -p /var/lib/erd4dev
touch /var/lib/erd4dev/database.sqlite
if ! find database/migrations -maxdepth 1 -name '*create_sessions_table*' -print -quit | grep -q .; then
    php artisan make:session-table --no-interaction
fi
php artisan migrate --force
exec php artisan serve --host=0.0.0.0 --port=8000
