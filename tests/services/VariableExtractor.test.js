import { describe, it, expect } from 'vitest';
import { VariableExtractor } from '../../public/src/services/VariableExtractor.js';

describe('VariableExtractor.isChatEnded', () => {
  const extractor = new VariableExtractor();

  it('returns false for null, undefined, numbers, and other non-string/object inputs', () => {
    expect(extractor.isChatEnded(null)).toBe(false);
    expect(extractor.isChatEnded(undefined)).toBe(false);
    expect(extractor.isChatEnded(42)).toBe(false);
    expect(extractor.isChatEnded(true)).toBe(false);
  });

  it('detects "chat ended" and "Chat already ended" in string error messages (case-insensitive)', () => {
    expect(extractor.isChatEnded('Chat already ended')).toBe(true);
    expect(extractor.isChatEnded('this chat ended yesterday')).toBe(true);
    expect(extractor.isChatEnded('CHAT ALREADY ENDED')).toBe(true);
    expect(extractor.isChatEnded('something else failed')).toBe(false);
  });

  it('treats ENDED_STATUS values in status / chat_status as ended', () => {
    expect(extractor.isChatEnded({ status: 'ended' })).toBe(true);
    expect(extractor.isChatEnded({ status: 'finished' })).toBe(true);
    expect(extractor.isChatEnded({ status: 'completed' })).toBe(true);
    expect(extractor.isChatEnded({ status: 'error' })).toBe(true);
    expect(extractor.isChatEnded({ chat_status: 'ended' })).toBe(true);
    expect(extractor.isChatEnded({ status: 'in_progress' })).toBe(false);
    expect(extractor.isChatEnded({ status: 'active' })).toBe(false);
  });

  it('treats boolean fields set to true as ended', () => {
    expect(extractor.isChatEnded({ ended: true })).toBe(true);
    expect(extractor.isChatEnded({ is_ended: true })).toBe(true);
    expect(extractor.isChatEnded({ finished: true })).toBe(true);
  });

  it('ignores boolean fields that are not strictly true (only true counts)', () => {
    expect(extractor.isChatEnded({ ended: false })).toBe(false);
    expect(extractor.isChatEnded({ ended: 'true' })).toBe(false);
    expect(extractor.isChatEnded({ ended: 1 })).toBe(false);
  });

  it('treats any non-null timestamp field as ended', () => {
    expect(extractor.isChatEnded({ ended_at: 1234567890 })).toBe(true);
    expect(extractor.isChatEnded({ finished_at: '2026-01-01' })).toBe(true);
    expect(extractor.isChatEnded({ end_time: 0 })).toBe(true);
    expect(extractor.isChatEnded({ ended_at: null })).toBe(false);
    expect(extractor.isChatEnded({ ended_at: undefined })).toBe(false);
  });

  it('returns false for plain object with no ended markers', () => {
    expect(extractor.isChatEnded({})).toBe(false);
    expect(extractor.isChatEnded({ messages: [], status: 'active' })).toBe(false);
  });
});

describe('VariableExtractor.extract', () => {
  const extractor = new VariableExtractor();

  it('returns null for invalid inputs', () => {
    expect(extractor.extract(null)).toBeNull();
    expect(extractor.extract(undefined)).toBeNull();
    expect(extractor.extract('string')).toBeNull();
  });

  it('extracts from data.variables', () => {
    const result = extractor.extract({ variables: { first_name: 'Ana' } });
    expect(result).toEqual({ first_name: 'Ana' });
  });

  it('extracts from nested data.metadata.variables', () => {
    const result = extractor.extract({ metadata: { variables: { email: 'a@b.c' } } });
    expect(result).toEqual({ email: 'a@b.c' });
  });

  it('extracts from data.extracted_variables', () => {
    const result = extractor.extract({ extracted_variables: { company_name: 'ACME' } });
    expect(result).toEqual({ company_name: 'ACME' });
  });

  it('extracts from nested data.state.variables', () => {
    const result = extractor.extract({ state: { variables: { call_type: 'inbound' } } });
    expect(result).toEqual({ call_type: 'inbound' });
  });

  it('filters out null, undefined, and empty string values', () => {
    const result = extractor.extract({
      variables: { first_name: 'Ana', last_name: '', email: null, phone: undefined }
    });
    expect(result).toEqual({ first_name: 'Ana' });
  });

  it('returns null when all values are empty after filtering', () => {
    const result = extractor.extract({ variables: { a: '', b: null } });
    expect(result).toBeNull();
  });

  it('returns null when no variables field is present', () => {
    expect(extractor.extract({ messages: [] })).toBeNull();
  });
});

describe('VariableExtractor.extractBotResponse', () => {
  const extractor = new VariableExtractor();

  it('returns the last agent message from messages array', () => {
    const data = {
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'agent', content: 'hello' },
        { role: 'user', content: 'thanks' },
        { role: 'agent', content: 'you are welcome' },
      ]
    };
    expect(extractor.extractBotResponse(data)).toBe('you are welcome');
  });

  it('skips agent messages with no content', () => {
    const data = {
      messages: [
        { role: 'agent', content: 'real reply' },
        { role: 'agent', content: '' },
        { role: 'agent', content: null },
      ]
    };
    expect(extractor.extractBotResponse(data)).toBe('real reply');
  });

  it('falls back to data.response string', () => {
    expect(extractor.extractBotResponse({ response: 'fallback' })).toBe('fallback');
  });

  it('falls back to data.output_text string', () => {
    expect(extractor.extractBotResponse({ output_text: 'from output' })).toBe('from output');
  });

  it('returns sentinel "No response received" for unknown shapes', () => {
    expect(extractor.extractBotResponse({})).toBe('No response received');
    expect(extractor.extractBotResponse({ unrelated: true })).toBe('No response received');
  });
});

describe('VariableExtractor.isPriorityVar', () => {
  const extractor = new VariableExtractor();

  it('recognises known priority variables', () => {
    expect(extractor.isPriorityVar('first_name')).toBe(true);
    expect(extractor.isPriorityVar('email')).toBe(true);
    expect(extractor.isPriorityVar('call_type')).toBe(true);
  });

  it('returns false for unknown variable names', () => {
    expect(extractor.isPriorityVar('random_field')).toBe(false);
    expect(extractor.isPriorityVar('')).toBe(false);
  });
});
