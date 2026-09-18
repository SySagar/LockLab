import { describe, it, expect } from 'vitest';

import {
  MESSAGE_TYPES,
  ERROR_CODES,
  isMessageEnvelope,
  createErrorMessage
} from '@locklab/protocol';
import {
  makeRequestId,
  makeMessageEnvelope,
  makeErrorPayload
} from './factories.js';

describe('protocol contract', () => {
  it('exposes the stable message names used by the protocol', () => {
    expect(MESSAGE_TYPES.CONNECTOR_REGISTER).toBe('connector.register');
    expect(MESSAGE_TYPES.POSTGRES_STATUS).toBe('postgres.status');
    expect(MESSAGE_TYPES.ERROR).toBe('error');
  });

  it('exposes the stable error codes used by the protocol', () => {
    expect(ERROR_CODES.POSTGRES_UNREACHABLE).toBe('POSTGRES_UNREACHABLE');
    expect(ERROR_CODES.UNEXPECTED_ERROR).toBe('UNEXPECTED_ERROR');
  });

  it('creates a valid message envelope that preserves request correlation and payload data', () => {
    const requestId = makeRequestId('req');
    const envelope = makeMessageEnvelope({
      type: MESSAGE_TYPES.POSTGRES_STATUS,
      requestId,
      payload: { status: 'connected' }
    });

    expect(envelope).toMatchObject({
      type: MESSAGE_TYPES.POSTGRES_STATUS,
      requestId,
      payload: { status: 'connected' }
    });
    expect(isMessageEnvelope(envelope)).toBe(true);
  });

  it('accepts only values that match the message envelope shape', () => {
    expect(isMessageEnvelope({
      type: MESSAGE_TYPES.POSTGRES_STATUS,
      payload: { status: 'connected' }
    })).toBe(true);

    expect(isMessageEnvelope({
      payload: { status: 'connected' }
    })).toBe(false);

    expect(isMessageEnvelope({
      type: MESSAGE_TYPES.POSTGRES_STATUS
    })).toBe(false);

    expect(isMessageEnvelope({
      type: MESSAGE_TYPES.ERROR,
      payload: undefined
    })).toBe(false);

    expect(isMessageEnvelope(null)).toBe(false);
  });

  it('rejects malformed envelopes that are missing required fields', () => {
    expect(isMessageEnvelope({
      type: MESSAGE_TYPES.ERROR,
      requestId: 'req-123'
    })).toBe(false);

    expect(isMessageEnvelope({
      payload: {
        code: ERROR_CODES.UNEXPECTED_ERROR,
        message: 'bad payload'
      }
    })).toBe(false);

    expect(isMessageEnvelope({
      type: '',
      payload: null
    })).toBe(false);
  });

  it('creates an error envelope with the required payload and request id', () => {
    const requestId = makeRequestId('req');
    const errorPayload = makeErrorPayload({
      code: ERROR_CODES.POSTGRES_UNREACHABLE,
      message: 'Database unreachable',
      details: { host: 'localhost' }
    });

    const message = createErrorMessage({
      requestId,
      ...errorPayload
    });

    expect(message.type).toBe(MESSAGE_TYPES.ERROR);
    expect(message.requestId).toBe(requestId);
    expect(message.payload).toEqual(errorPayload);
    expect(isMessageEnvelope(message)).toBe(true);
  });
});
