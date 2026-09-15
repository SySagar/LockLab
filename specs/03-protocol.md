# LockLab — Communication Protocol Specification

## 1. Purpose

## 1.1 Human-in-the-loop implementation policy

AI is an assistant for this project, not the implementer.

Rules:
- Human developers own the final decisions.
- AI may suggest commands, boilerplate, small snippets, and inline completions.
- AI should not directly write the implementation for protocol logic, DB/session lifecycle, or PostgreSQL process management without human approval.
- Autocomplete and tab completion are allowed only as speed aids.
- Anything that changes behavior must be reviewed and accepted manually before being kept.

## 1.2 Test-driven development requirement

All implementation work in this project must follow TDD.

Required workflow:
- write the smallest failing test or smoke validation before implementation
- implement only the code needed to satisfy the test
- validate the relevant behavior with the smallest command that checks it
- only then move to the next step or feature

This applies to protocol, bridge logic, connector logic, terminal lifecycle, lock state handling, and database initialization.

Examples:
- a protocol unit test that asserts the canonical message constants
- a smoke test that verifies the bridge forwards a message without changing its payload
- a connector test that ensures a rejected terminal create yields the correct machine-readable error code

No feature is considered complete without the required failing-then-passing validation.

## 1.3 Required human execution workflow

The project must not be modified automatically by AI on the basis of generic guidance alone.

Required workflow:
- AI must propose explicit implementation steps with commands, file targets, and verification commands.
- Human reviewers must approve each step before files are created or edited.
- AI must not apply code or config changes automatically after generating a plan.
- Any task that changes runtime behavior, protocol contracts, database handling, or process lifecycle requires explicit human confirmation before persistence.

Examples of required command-level detail:

```bash
mkdir -p packages/protocol
cat > packages/protocol/package.json <<'EOF'
{
  "name": "@locklab/protocol",
  "version": "0.1.0",
  "private": true,
  "type": "module"
}
EOF
npm init -y
npm install --save-dev typescript
```

```bash
mkdir -p backend/bridge backend/connector apps/web
python -m venv .venv
source .venv/bin/activate
pip install django djangorestframework channels
```

These examples are intentionally explicit. The implementation must be step-specific, not vague. A phase is not considered actionable until the task includes:
- exact command(s)
- target file(s) or directory(s)
- expected outcome
- verification command(s)

## 1.3 No auto-apply rule

AI must not make file edits, project scaffolding, dependency changes, or runtime logic changes unless the human explicitly asks it to do so after reviewing the exact steps.

This includes:
- creating package manifests
- installing dependencies
- creating folders or files
- editing protocol schemas
- changing Django settings
- creating bridge/connector startup code
- modifying PostgreSQL session or psql lifecycle logic

The AI may present a draft plan and commands, but it must wait for explicit permission before making changes to the repository.

---

This specification defines communication between the LockLab components:

```text
Browser
   ↕
Bridge
   ↕
Connector
```

The protocol allows the browser to:

* create and manage terminal sessions
* send terminal input
* receive terminal output
* receive connector/PostgreSQL status
* receive lock state
* request database setup/reset

The protocol does **not** define PostgreSQL's behavior.

PostgreSQL remains the source of truth for SQL execution, transactions,
locks, blocking, and waiting.

---

# 2. Communication Architecture

The communication path is:

```text
React Browser
     │
     │ WebSocket
     ▼
  Bridge
     │
     │ Secure connection/tunnel
     ▼
 Connector
     │
     ├── psql processes
     │
     ├── Lock Watcher
     │
     └── PostgreSQL connection
```

The Bridge does not connect directly to PostgreSQL.

The Connector is the only component that communicates with the user's
local PostgreSQL instance.

---

# 3. Transport

WebSocket is used for persistent communication.

There are two logical connections:

```text
Browser ↔ Bridge

Bridge ↔ Connector
```

The Bridge forwards protocol messages between the Browser and Connector.

The Bridge should not interpret SQL or PostgreSQL-specific terminal
commands.

---

# 4. Message Format

All application messages use JSON.

Base structure:

```ts
type Message = {
  type: string;
  requestId?: string;
  payload?: unknown;
};
```

`type` identifies the message.

`requestId` is used when a request needs to be correlated with a
response.

`payload` contains message-specific data.

---

# 5. Connector Registration

When the Connector establishes communication with the Bridge, it
registers itself.

### Connector → Bridge

```json
{
  "type": "connector.register",
  "payload": {}
}
```

The exact authentication mechanism is defined separately by the
connection/security implementation.

The Connector must not expose PostgreSQL credentials to the Browser.

### Bridge → Connector

```json
{
  "type": "connector.registered",
  "payload": {}
}
```

---

# 6. PostgreSQL Connection Status

The Connector is responsible for checking whether the configured
PostgreSQL instance is reachable.

Possible states:

```text
connecting
connected
disconnected
error
```

### Connector → Browser

```json
{
  "type": "postgres.status",
  "payload": {
    "status": "connected"
  }
}
```

Possible status values:

```ts
type PostgresStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
```

If an error occurs, the message may include an error description.

---

# 7. Terminal Sessions

A terminal session represents one real `psql` process.

The invariant is:

```text
Browser Terminal
      ↓
Terminal Session
      ↓
psql Process
      ↓
PostgreSQL Connection
```

Every terminal session must use an independent `psql` process.

Terminal sessions must not share a PostgreSQL connection.

---

# 8. Terminal Creation

The Browser requests a new terminal.

### Browser → Connector

```json
{
  "type": "terminal.create",
  "requestId": "req-123",
  "payload": {}
}
```

The Connector:

1. creates a new session ID
2. spawns a new `psql` process
3. connects it to the configured PostgreSQL instance
4. starts forwarding its output
5. returns the session information
6. persists the `sessionId` → observed `pid` mapping in a local store for robust session→process association
7. enforces the maximum concurrent sessions limit (5). If the limit is reached the Connector must reject the request with an appropriate error (see Error Codes).

### Connector → Browser

```json
{
  "type": "terminal.created",
  "requestId": "req-123",
  "payload": {
    "sessionId": "session-1"
  }
}
```

The Connector owns the creation of the session ID.

---

# 9. Terminal Input

Terminal input originates from xterm.js.

### Browser → Connector

```json
{
  "type": "terminal.input",
  "payload": {
    "sessionId": "session-1",
    "data": "SELECT 1;\r"
  }
}
```

The Connector writes `data` to the stdin of the corresponding
`psql` process.

The Connector must not parse or modify SQL.

---

# 10. Terminal Output

Output from `psql` is forwarded to the Browser.

### Connector → Browser

```json
{
  "type": "terminal.output",
  "payload": {
    "sessionId": "session-1",
    "data": " ?column?\n----------\n        1\n"
  }
}
```

The Browser writes the received data directly to the corresponding
xterm.js instance.

Terminal output ordering must be preserved.

The protocol does not interpret SQL output.

---

# 11. Terminal Close

The Browser requests that a terminal session be closed.

### Browser → Connector

```json
{
  "type": "terminal.close",
  "payload": {
    "sessionId": "session-1"
  }
}
```

The Connector terminates the corresponding `psql` process and releases
its resources.

### Connector → Browser

```json
{
  "type": "terminal.closed",
  "payload": {
    "sessionId": "session-1"
  }
}
```

---

# 12. Unexpected psql Exit

If a `psql` process exits unexpectedly, the Connector must notify the
Browser.

### Connector → Browser

```json
{
  "type": "terminal.exit",
  "payload": {
    "sessionId": "session-1",
    "exitCode": 1
  }
}
```

The Browser should mark the terminal session as disconnected/closed.

---

# 12. Lock State

The Connector's Lock Watcher periodically observes PostgreSQL.

The watcher uses PostgreSQL system information such as:

```text
pg_stat_activity
pg_locks
```

The Connector converts the observed state into a LockState object.

### Connector → Browser

```json
{
  "type": "lock.state",
  "payload": {
    "sessions": [],
    "locks": [],
    "blocking": []
  }
}
```

The Browser does not query PostgreSQL directly.

---

# 15. Lock State Model

Initial conceptual model:

```ts
type LockState = {
  sessions: SessionState[];
  locks: LockInfo[];
  blocking: BlockingRelationship[];
};
```

A session represents a PostgreSQL activity associated with a LockLab
terminal where possible.

```ts
type SessionState = {
  sessionId?: string;
  pid: number;
  state: string;
  query?: string;
};
```

Lock information:

```ts
type LockInfo = {
  pid: number;
  lockType: string;
  mode: string;
  granted: boolean;
  // `relation` is a simple, human-readable identifier when applicable.
  // Use `schema.table` (for example: "public.accounts"). For lock
  // types that do not reference a relation, `relation` MAY be null or omitted.
  relation?: string | null;
};
```

Blocking relationship:

```ts
type BlockingRelationship = {
  blockerPid: number;
  blockedPid: number;
};
```

The exact PostgreSQL lock mapping will be defined by the Lock Engine
specification.

---

# 16. Database Initialization

The Connector may be asked to initialize the LockLab demo schema.

### Browser → Connector

```json
{
  "type": "database.initialize",
  "requestId": "req-456",
  "payload": {}
}
```

The Connector executes the required setup against the user's configured
PostgreSQL database.

The Connector executes idempotent SQL/setup scripts against the configured
database to initialize demo schema and seed data. On failure the Connector
must return a machine-readable error (see Canonical Error Codes — `DATABASE_INIT_FAILED`).

### Connector → Browser

```json
{
  "type": "database.initialize.complete",
  "requestId": "req-456",
  "payload": {}
}
```

Initialization operates on the user's existing PostgreSQL database.

It does not create, restart, or manage the PostgreSQL server/container.

---

# 17. Database Reset
The Browser may request that the LockLab demo data be reset. For the
initial product release, `database.reset` is NOT SUPPORTED.

If the Browser nevertheless issues a `database.reset` request, the
Connector MUST NOT attempt to stop/restart PostgreSQL or the user's
container. The Connector should reject the request and return a
machine-readable error indicating the operation is not allowed
(see Canonical Error Codes — `DATABASE_RESET_NOT_ALLOWED`).

---

# 18. Errors

Operations that fail should return an error message.

```json
{
  "type": "error",
  "requestId": "req-123",
  "payload": {
    "code": "TERMINAL_CREATE_FAILED",
    "message": "Unable to create terminal"
  }
}
```

The `code` should be machine-readable.

The `message` is intended for debugging/UI display and must not expose
sensitive information such as PostgreSQL passwords.

---

# 19. Message Direction

The initial protocol supports:

```text
                    Browser → Connector

terminal.create
terminal.input
terminal.close
database.initialize
```

and:

```text
                    Connector → Browser

connector.registered
postgres.status
terminal.created
terminal.output
terminal.closed
terminal.exit
lock.state
database.initialize.complete
error
```

The Bridge forwards these messages and does not execute their
operations.

---

# 20. Request IDs

Commands that require a response should include a `requestId`.

Example:

```text
Browser
   │
   │ terminal.create
   │ requestId = abc
   ▼
Connector
   │
   │ terminal.created
   │ requestId = abc
   ▼
Browser
```

This allows the Browser to correlate asynchronous responses with the
request that caused them.

---

# 21. Session IDs

A `sessionId` identifies a LockLab terminal session.

The Connector generates the `sessionId`.

The same `sessionId` is used for:

```text
terminal.input
terminal.output
terminal.resize
terminal.close
terminal.closed
terminal.exit
```

The session ID is also used to associate a LockLab terminal with the
corresponding PostgreSQL process where possible.

The Connector must persist the observed mapping between `sessionId`
and the OS `pid`(s) associated with the spawned `psql` process in a
local store (for example, SQLite). This mapping helps maintain correct
associations when helper processes or PID changes are observed.

---

# 22. Important Invariants

The following invariants must always hold.

### Invariant 1

The Browser never connects directly to PostgreSQL.

### Invariant 2

The Bridge never directly connects to PostgreSQL.

### Invariant 3

Only the Connector accesses the user's local PostgreSQL.

### Invariant 4

Every terminal session has its own `psql` process.

### Invariant 5

Every `psql` process has its own PostgreSQL connection.

### Invariant 6

SQL is never executed by the Browser or Bridge.

### Invariant 7

Lock state comes from real PostgreSQL state.

### Invariant 8

The Bridge does not simulate, interpret, or modify PostgreSQL behavior.

---

# 23. Out of Scope

This protocol does not currently define:

* user authentication
* connector authentication implementation
* tunnel implementation
* scenario definitions
* exact lock detection SQL
* lock graph rendering
* PostgreSQL schema details
* Docker configuration
* persistent user accounts
* multi-user collaboration
* session sharing between users

These will be handled by their respective specifications.

---


## Canonical Error Codes

The Connector and Bridge SHOULD use the following canonical error codes
in the `error` message payload. Codes are machine-readable strings and
the Connector SHOULD include an explanatory `message` and optional
`details` (no sensitive data).

- `TERMINAL_CREATE_FAILED` (1001): failed to spawn `psql` for `terminal.create`.
- `TERMINAL_WRITE_FAILED` (1002): failed writing input to `psql` stdin.
- `TERMINAL_EXIT_UNEXPECTED` (1003): `psql` exited unexpectedly.
- `POSTGRES_UNREACHABLE` (2001): cannot reach configured Postgres host/port.
- `POSTGRES_AUTH_FAILED` (2002): authentication to Postgres failed.
- `MAX_SESSIONS_EXCEEDED` (3001): connector rejected `terminal.create` (max 5 sessions).
- `LOCK_WATCHER_ERROR` (4001): lock watcher query failed or returned malformed data.
- `DATABASE_INIT_FAILED` (5001): `database.initialize` failed to apply schema/seed.
- `DATABASE_RESET_NOT_ALLOWED` (5003): `database.reset` is not permitted in initial product.
- `CONNECTOR_DISCONNECTED` (9001): connector/tunnel disconnected unexpectedly.
- `UNEXPECTED_ERROR` (9999): fallback for uncategorized failures.
