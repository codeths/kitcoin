# Kitcoin

# How to use

## Docker

Docker Compose example:

```yml
version: '3.7'

services:
    web:
        image: ghcr.io/codeths/kitcoin/kitcoin:latest
        restart: unless-stopped
        init: true
        ports:
            - 8000:8000
        container_name: kitcoin
        volumes:
            - './keys.json:/app/dist/config/keys.json'
            - './uploads/storeitems:/app/uploads/storeitems'
```

Create a [config file](#config) called keys.json in that direcory.

## Non-Docker

### Install

1. Clone the repo: `git clone git@github.com:codeths/kitcoin.git`
2. Copy `src/config/keys.example.json` to `src/config/keys.json` and set it up. See the [config section](#config) for details.
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

| property         | type             | description                                | example                                |
| ---------------- | ---------------- | ------------------------------------------ | -------------------------------------- |
| mongo            | string           | MongoDB Connection URL                     | mongodb://user:pass@127.0.0.1:27017/db |
| port             | number           | port to listen on                          | 8000                                   |
| client_id        | string           | Google OAuth client ID                     |                                        |
| client_secret    | string           | Google OAuth client secret                 |                                        |
| oauthDomain      | string \| null   | Google OAuth domain, or null to disable    | mydomain.com                           |
| sessionSecret    | string           | Session secret for Mongo                   |                                        |
| weeklyBalance    | number           | Staff's weekly balance                     | 100                                    |
| gadmin_domain    | string \| null   | Domain to use for Google Admin syncing     | mydomain.com                           |
| gadmin_staff_ou  | string[] \| null | Staff OU names for Google Admin syncing    | ["Staff", "Some OU/Admins"]            |
| gadmin_ignore_ou | string[] \| null | Excluded OU names for Google Admin syncing | ["Old students"]                       |

## Google Cloud Project Setup (For OAuth)

1. Create a [Google Cloud Project](https://console.cloud.google.com/projectcreate)
2. Go to APIs & Services > Library. Enable the Google Classroom API, Google People API, and Admin SDK API.
3. Go to APIs & Services > OAuth consent screen. Setup as desired.
4. Go to APIs & Services > Credentials. Click "Create credentials" and select "OAuth client ID".
5. Select "Web application" for the type. Add your domain to the authorized origins. For redirect URIs, add your domain with the path `/auth/cbk`.
6. Create the Client ID. Copy the client ID and client secret to the config file as shown above.
