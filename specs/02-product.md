# LockLab Product Specification

## Purpose

LockLab is an interactive PostgreSQL lock playground.

It allows developers to observe real PostgreSQL locking behavior
using their own locally running PostgreSQL instance.

## Core Principle

LockLab does not simulate PostgreSQL.

All SQL execution and locking behavior happens inside the user's
real PostgreSQL instance run locally by docker.

## User Capabilities

The user can:

1. Connect LockLab to a local PostgreSQL instance.
2. Open multiple terminal sessions in browser as tabs (each tab is one session).
3. Execute SQL in each session.
4. Run transactions independently.
5. Create lock contention.
6. Create deadlocks.
7. Observe blocking relationships (for the user's own sessions only).

## Constraints

LockLab must not:

- host PostgreSQL
- expose PostgreSQL directly to the internet
- simulate SQL execution
- replace psql with a fake terminal
- manage the user's PostgreSQL Docker container (LockLab does not start/stop containers)

Other immediate constraints and decisions:

- PostgreSQL must run via Docker on the user's machine; LockLab will not create or start the container (todo-futures: automated container start).
- No authentication: the initial experiment will run without auth or pairing.
- Connector is delivered as a Node CLI (npm package) the user installs locally.
- Connection model: each browser tab maps 1:1 to a real `psql` process and independent PostgreSQL connection. This invariant must be preserved.
- On browser refresh or reopen the corresponding `psql` process MUST be terminated immediately.
- Lock watcher uses polling against Postgres every 6 seconds.

Lock watcher data shape (minimum): `pid`, `username`, `state`, `mode`, `granted`, `query`.

- `username` displayed in the Web App must follow the pattern: `postgres-<session-id>` where `<session-id>` is up to 7 digits.
- Failure handling: if PostgreSQL restarts, the connector crashes, or the tunnel disconnects, the UI shows an explicit error and requires the user to manually "Restart session"; no automatic restart is attempted.
- Concurrency limits: the system should allow up to 5 concurrent browser tabs/sessions per user.
 - `username` displayed in the Web App must follow the pattern: `postgres-<session-id>` where `<session-id>` is up to 7 digits.
 - Failure handling: if PostgreSQL restarts, the connector crashes, or the tunnel disconnects, the UI shows an explicit error and requires the user to manually "Restart session"; no automatic restart is attempted.
 - Concurrency limits: the system should allow up to 5 concurrent browser tabs/sessions per user. The Connector enforces this limit and rejects new session requests when the limit is reached.
 - PID persistence: the Connector persists the mapping of LockLab `sessionId` to observed OS `pid` values locally (e.g., SQLite or equivalent) to ensure robust session→process association across observed process changes.
 - Database reset: resetting demo data via the app is NOT allowed in the initial product; initialization (idempotent setup/seed) may be supported, but `database.reset` is deferred for future work and must not attempt to stop/restart Postgres.

## Todo-Futures

- Auto-start or manage Docker containers for demo Postgres instances.
 - Scenario runner and scripted multi-session scenarios.
 - Reset demo-database functionality (DEFERRED — not allowed in initial product release).