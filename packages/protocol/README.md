# LockLab Protocol

## Core rule
- Browser never connects directly to PostgreSQL.
- Bridge only relays WebSocket messages.
- Connector is the only component that creates `psql` processes and interacts with PostgreSQL.

## Base envelope
```ts
type Message = {
  type: string;
  requestId?: string;
  payload?: unknown;
};
```

## Canonical message types

### Browser -> Connector
- `terminal.create`
- `terminal.input`
- `terminal.close`
- `database.initialize`

### Connector -> Browser
- `connector.registered`
- `postgres.status`
- `terminal.created`
- `terminal.output`
- `terminal.closed`
- `terminal.exit`
- `lock.state`
- `database.initialize.complete`
- `error`

## Canonical error codes
- `TERMINAL_CREATE_FAILED`
- `TERMINAL_WRITE_FAILED`
- `TERMINAL_EXIT_UNEXPECTED`
- `POSTGRES_UNREACHABLE`
- `POSTGRES_AUTH_FAILED`
- `MAX_SESSIONS_EXCEEDED`
- `LOCK_WATCHER_ERROR`
- `DATABASE_INIT_FAILED`
- `DATABASE_RESET_NOT_ALLOWED`
- `CONNECTOR_DISCONNECTED`
- `UNEXPECTED_ERROR`
