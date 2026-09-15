/*
  This module defines the message types and error codes used in the communication protocol between the client and the connector.
*/

export const MESSAGE_TYPES = Object.freeze({
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
});

export const ERROR_CODES = Object.freeze({
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
});

export function isMessageEnvelope(value) {
  /*
  This function checks if the provided value is a valid message(ex:: { type: 'some.type', payload: {} })
   by verifying that it is an object and has a 'type' property of type string.
  */
  return Boolean(value && typeof value === 'object' && typeof value.type === 'string');
}

export function createErrorMessage({ code = ERROR_CODES.UNEXPECTED_ERROR, message = 'Unexpected error', requestId, details } = {}) {
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

export function createTerminalCreatedMessage({ requestId, sessionId }) {
  // function to create a message indicating that a terminal session has been successfully created. It includes the session ID and optionally the request ID if provided.
  return {
    type: MESSAGE_TYPES.TERMINAL_CREATED,
    ...(requestId ? { requestId } : {}),
    payload: { sessionId }
  };
}

export function createTerminalOutputMessage({ sessionId, data }) {
  // function to create a message indicating output from a terminal session. It includes the session ID and the output data.
  return {
    type: MESSAGE_TYPES.TERMINAL_OUTPUT,
    payload: { sessionId, data }
  };
}

export function createPostgresStatusMessage(status, details) {
  /*
  This function creates a message indicating the status of a PostgreSQL connection via the connector.
   It includes the status and optionally additional details if provided.
  */
  return {
    type: MESSAGE_TYPES.POSTGRES_STATUS,
    payload: {
      status,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export function createLockStateMessage(lockState) {
  /*
  This function creates a message indicating the current lock state of the system. Used in flow
   from the connector to the client to inform about the lock state.
  */
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
