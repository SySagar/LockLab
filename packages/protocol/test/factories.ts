import type { ErrorCode, MessageEnvelope, MessageType } from '@locklab/protocol';

export function makeRequestId(prefix = 'req'): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

// Creates a typed protocol message envelope for testing with a valid message type.
export function makeMessageEnvelope<TType extends MessageType, TPayload>({
  type,
  requestId = makeRequestId(),
  payload,
  version = '1.0',
  timestamp = new Date().toISOString()
}: {
  type: TType;
  requestId?: string;
  payload: TPayload;
  version?: string;
  timestamp?: string;
}): MessageEnvelope<TType, TPayload> {
  return {
    type,
    version,
    requestId,
    timestamp,
    payload
  };
}

// Builds a standard error payload with a default unexpected-error code.
export function makeErrorPayload({
  code = 'UNEXPECTED_ERROR' as ErrorCode,
  message = 'Unexpected error',
  details
}: {
  code?: ErrorCode;
  message?: string;
  details?: unknown;
} = {}) {
  return {
    code,
    message,
    ...(details !== undefined ? { details } : {})
  };
}
