FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libsqlite3-dev libonig-dev libxml2-dev \
    && docker-php-ext-install mbstring pdo_sqlite xml \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . /workspace/erd4dev
WORKDIR /app

# Build a real Laravel host application so package routes, Livewire requests,
# persistence and Blueprint output are exercised in their normal environment.
RUN composer create-project laravel/laravel . --prefer-dist --no-interaction \
    && composer config repositories.erd4dev '{"type":"path","url":"/workspace/erd4dev","options":{"symlink":true}}' \
    && composer config minimum-stability dev \
    && composer config prefer-stable true \
    && composer require makermind/erd4dev:dev-develop getartisanflow/wireflow:0.2.4-alpha --no-interaction \
    && touch database/database.sqlite \
    && php artisan key:generate --force

COPY demo/entrypoint.sh /usr/local/bin/erd4dev-demo
RUN chmod +x /usr/local/bin/erd4dev-demo

EXPOSE 8000
ENTRYPOINT ["erd4dev-demo"]
