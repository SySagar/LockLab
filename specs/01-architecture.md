# LockLab Architecture Specification

## Components

LockLab consists of:

1. Web App
2. Bridge
3. Local Connector
4. User PostgreSQL

## Web App

Technology:

- React
- Vite
- TypeScript
- xterm.js

Responsibilities:

- render terminal sessions
- send terminal input
- display terminal output
- display connection state
- display lock state
- provide scenarios
- provide reset controls

The Web App must never connect directly to PostgreSQL.

## Bridge

The Bridge provides communication between the browser
and the local connector. It is a django drf based web-socket connection from browser to this bridge.

The Bridge must not connect to PostgreSQL.

The Bridge must not execute SQL.

## Connector

The Connector runs on the user's machine and is delivered as a Node.js CLI (npm package) that the user installs and runs locally (e.g. `npm install -g locklab-connector`).

Responsibilities:

- establish tunnel connection between the Bridge and the local host
- spawn `psql` processes (one `psql` per browser tab/session)
- forward terminal input/output between `psql` and the Web App
- interact with PostgreSQL via the user's Docker container (Connector should prefer invoking `psql` via `docker exec` into the container so the host does not require a separate `psql` binary)
- run the lock watcher (polling queries against Postgres every 6 seconds)
- validate local prerequisites at startup and surface clear errors (check Docker availability, container presence, and ability to exec `psql`)

Behavioral details:

- The Connector must not attempt to start or manage PostgreSQL containers; the user is responsible for running the Postgres Docker container.
- When a browser tab creates a session, the Connector spawns a new `psql` process attached to an independent DB connection.
- On browser refresh or tab close the Connector MUST terminate the associated `psql` process immediately.
- The lock watcher polls `pg_stat_activity`/`pg_locks` and emits the following fields to the Bridge: `pid`, `username`, `state`, `mode`, `granted`, `query`.
- The Connector enforces a maximum of 5 concurrent `psql` processes/sessions.
- On failures (Postgres restart, connector crash, tunnel disconnect), the Connector and Bridge should surface an explicit error; no automatic session restart is attempted.
- For the initial experiment there is no authentication; the Bridge and Connector assume a trusted local environment.

## PostgreSQL

PostgreSQL runs locally on the user's machine,
preferably through Docker.

LockLab does not start, stop, or manage PostgreSQL.