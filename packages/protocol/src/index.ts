/*
  Shared protocol contract for LockLab.
  All message payloads are strongly typed so browser and connector code stay in sync.
*/

export const MESSAGE_TYPES = {
  CONNECTOR_REGISTER: 'connector.register',
  CONNECTOR_REGISTERED: 'connector.registered',
  POSTGRES_STATUS: 'postgres.status',
  TERMINAL_CREATE: 'terminal.create',
  TERMINAL_CREATED: 'terminal.created',
  TERMINAL_INPUT: 'terminal.input',
  TERMINAL_OUTPUT: 'terminal.output',
  TERMINAL_CLOSE: 'terminal.close',
  TERMINAL_CLOSED: 'terminal.closed',
  TERMINAL_EXIT: 'terminal.exit',
  LOCK_STATE: 'lock.state',
  DATABASE_INITIALIZE: 'database.initialize',
  DATABASE_INITIALIZE_COMPLETE: 'database.initialize.complete',
  ERROR: 'error'
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export const ERROR_CODES = {
  TERMINAL_CREATE_FAILED: 'TERMINAL_CREATE_FAILED',
  TERMINAL_WRITE_FAILED: 'TERMINAL_WRITE_FAILED',
  TERMINAL_EXIT_UNEXPECTED: 'TERMINAL_EXIT_UNEXPECTED',
  POSTGRES_UNREACHABLE: 'POSTGRES_UNREACHABLE',
  POSTGRES_AUTH_FAILED: 'POSTGRES_AUTH_FAILED',
  MAX_SESSIONS_EXCEEDED: 'MAX_SESSIONS_EXCEEDED',
  LOCK_WATCHER_ERROR: 'LOCK_WATCHER_ERROR',
  DATABASE_INIT_FAILED: 'DATABASE_INIT_FAILED',
  DATABASE_RESET_NOT_ALLOWED: 'DATABASE_RESET_NOT_ALLOWED',
  CONNECTOR_DISCONNECTED: 'CONNECTOR_DISCONNECTED',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ConnectorRegisterPayload = Record<string, never>;
export type ConnectorRegisteredPayload = Record<string, never>;
export type PostgresStatusPayload = {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  details?: unknown;
};
export type TerminalCreatePayload = {
  sessionId: string;
  columns?: number;
  rows?: number;
};
export type TerminalCreatedPayload = {
  sessionId: string;
};
export type TerminalInputPayload = {
  sessionId: string;
  data: string;
};
export type TerminalOutputPayload = {
  sessionId: string;
  data: string;
};
export type TerminalClosePayload = {
  sessionId: string;
  reason?: string;
};
export type TerminalClosedPayload = {
  sessionId: string;
};
export type TerminalExitPayload = {
  sessionId: string;
  code?: number;
  signal?: string;
};
export type LockStateRow = {
  pid: number;
  username: string;
  state: string;
  mode: string;
  granted: boolean;
  query?: string;
};
export type LockStatePayload = LockStateRow[];
export type DatabaseInitializePayload = {
  database: string;
  options?: Record<string, string | number | boolean | null>;
};
export type DatabaseInitializeCompletePayload = {
  database: string;
  initialized: boolean;
};

export type ErrorPayload = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type ProtocolPayloadMap = {
  [MESSAGE_TYPES.CONNECTOR_REGISTER]: ConnectorRegisterPayload;
  [MESSAGE_TYPES.CONNECTOR_REGISTERED]: ConnectorRegisteredPayload;
  [MESSAGE_TYPES.POSTGRES_STATUS]: PostgresStatusPayload;
  [MESSAGE_TYPES.TERMINAL_CREATE]: TerminalCreatePayload;
  [MESSAGE_TYPES.TERMINAL_CREATED]: TerminalCreatedPayload;
  [MESSAGE_TYPES.TERMINAL_INPUT]: TerminalInputPayload;
  [MESSAGE_TYPES.TERMINAL_OUTPUT]: TerminalOutputPayload;
  [MESSAGE_TYPES.TERMINAL_CLOSE]: TerminalClosePayload;
  [MESSAGE_TYPES.TERMINAL_CLOSED]: TerminalClosedPayload;
  [MESSAGE_TYPES.TERMINAL_EXIT]: TerminalExitPayload;
  [MESSAGE_TYPES.LOCK_STATE]: LockStatePayload;
  [MESSAGE_TYPES.DATABASE_INITIALIZE]: DatabaseInitializePayload;
  [MESSAGE_TYPES.DATABASE_INITIALIZE_COMPLETE]: DatabaseInitializeCompletePayload;
  [MESSAGE_TYPES.ERROR]: ErrorPayload;
};

/* an indexed type that maps the message type to its corresponding payload
 type like (ConnectorRegisterPayload | LockStatePayload| ErrorPayload| ...) */
export type TPayload = ProtocolPayloadMap[MessageType]; 

export type MessageEnvelope<
  TType extends MessageType = MessageType,
  TPayloadValue = ProtocolPayloadMap[TType]
> = {
  type: TType;
  requestId?: string;
  version?: string;
  timestamp?: string;
  payload: TPayloadValue;
};

export function isMessageEnvelope<TType extends MessageType>(value: unknown): value is MessageEnvelope<TType> {
  // Type guard that validates a candidate value as a protocol message envelope.
  // Requires a non-empty string `type` and a non-null payload value.
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { type?: unknown; payload?: unknown };

  return Boolean(
    typeof candidate.type === 'string' &&
      candidate.type.length > 0 &&
      'payload' in candidate &&
      candidate.payload !== undefined &&
      candidate.payload !== null
  );
}

export function createErrorMessage({
  code = ERROR_CODES.UNEXPECTED_ERROR,
  message = 'Unexpected error',
  requestId,
  details
}: {
  code?: ErrorCode;
  message?: string;
  requestId?: string;
  details?: unknown;
} = {}): MessageEnvelope<typeof MESSAGE_TYPES.ERROR, ErrorPayload> {
  // Creates an error envelope with a default unexpected-error payload.
  // Includes an optional requestId and preserves details when provided.
  return {
    type: MESSAGE_TYPES.ERROR,
    ...(requestId ? { requestId } : {}),
    payload: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export function createTerminalCreatedMessage({ requestId, sessionId }: { requestId?: string; sessionId: string }): MessageEnvelope<typeof MESSAGE_TYPES.TERMINAL_CREATED, { sessionId: string }> {
  // Creates a terminal-created event for a known session.
  return {
    type: MESSAGE_TYPES.TERMINAL_CREATED,
    ...(requestId ? { requestId } : {}),
    payload: { sessionId }
  };
}

export function createTerminalOutputMessage({ sessionId, data }: { sessionId: string; data: string }): MessageEnvelope<typeof MESSAGE_TYPES.TERMINAL_OUTPUT, { sessionId: string; data: string }> {
  // Builds a terminal output message carrying the session id and raw terminal data.
  return {
    type: MESSAGE_TYPES.TERMINAL_OUTPUT,
    payload: { sessionId, data }
  };
}

export function createPostgresStatusMessage(status: string, details?: unknown): MessageEnvelope<typeof MESSAGE_TYPES.POSTGRES_STATUS, { status: string; details?: unknown }> {
  // Produces a PostgreSQL status update envelope.
  // `details` is omitted when it is undefined to keep the payload compact.
  return {
    type: MESSAGE_TYPES.POSTGRES_STATUS,
    payload: {
      status,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export function createLockStateMessage<TLockState>(lockState: TLockState): MessageEnvelope<typeof MESSAGE_TYPES.LOCK_STATE, TLockState> {
  // Wraps a lock-state snapshot in the canonical lock-state message envelope.
  return {
    type: MESSAGE_TYPES.LOCK_STATE,
    payload: lockState
  };
}

export default {
  MESSAGE_TYPES,
  ERROR_CODES,
  isMessageEnvelope,
  createErrorMessage,
  createTerminalCreatedMessage,
  createTerminalOutputMessage,
  createPostgresStatusMessage,
  createLockStateMessage
};
