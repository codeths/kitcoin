# Kitcoin

# How to use

## Docker

Docker Copmose example:

```yml
version: '3.7'

services:
    web:
        image: docker.pkg.github.com/chromezoneeths/kitcoin/kitcoin:latest
        restart: unless-stopped
        init: true
        ports:
            - 8000:8000
        container_name: kitcoin
        volumes:
            - './keys.json:/app/dist/config/keys.json'
```

Create a config file in that direcory.

## Non-Docker

### Install

1. Clone the repo: `git clone --recurse-submodules git@github.com:chromezoneeths/kitcoin.git`
2. Copy `src/config/keys.example.json` to `src/config/keys.json` and fill in the values as described.
3. Run `npm install`.
4. Run `npm run build`.

### Run

Use `node .` to run. [pm2](https://pm2.keymetrics.io/) or equivalent is recommended.

## Development

`npm run dev` will start node and listen to commands to easily manage the process:

-   `rs`, `restart`, `node` - Restart node
-   `build`, `gulp` - Run a full build (equivalent to `npm run build`)
-   `ts`, `typescript` - Build typescript only
-   `fe`, `frontend` - Build frontend only
-   `cp`, `copy` - Copy non-typescript files to dist
-   `stop`, `abort`, `close`, `cancel`, `exit` - Stop node and exit prompt

All build commands will also restart node. Make sure to use `build` the first time you start dev.

If you would like to watch for file changes and automatically execute the appropriate build command, use `npm run watch`. This has the same commands available as above.

# Config

| property      | type           | description                             | example                                |
| ------------- | -------------- | --------------------------------------- | -------------------------------------- |
| mongo         | string         | MongoDB Connection URL                  | mongodb://user:pass@127.0.0.1:27017/db |
| port          | number         | port to listen on                       | 8000                                   |
| client_id     | string         | Google OAuth client ID                  |                                        |
| client_secret | string         | Google OAuth client secret              |                                        |
| oauthDomain   | string \| null | Google OAuth domain, or null to disable | mydomain.com                           |
| sessionSecret | string         | Session secret for Mongo                |                                        |
| weeklyBalance | number         | Staff's weekly balance                  | 100                                    |
