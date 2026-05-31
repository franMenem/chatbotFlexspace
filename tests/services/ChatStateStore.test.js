import { describe, it, expect, beforeEach } from 'vitest';
import { ChatStateStore } from '../../public/src/services/ChatStateStore.js';

describe('ChatStateStore', () => {
  let store;

  beforeEach(() => {
    store = new ChatStateStore();
  });

  describe('initial state', () => {
    it('starts empty and inactive', () => {
      expect(store.chatId).toBeNull();
      expect(store.messages).toEqual([]);
      expect(store.isActive).toBe(false);
      expect(store.variables).toEqual({});
      expect(store.createdAt).toBeNull();
      expect(store.shouldResetChat).toBe(false);
    });

    it('isActiveChat() returns false on fresh store', () => {
      expect(store.isActiveChat()).toBe(false);
    });
  });

  describe('initChat', () => {
    it('sets chatId, marks active, clears messages, stamps createdAt', () => {
      store.addMessage('user', 'should be wiped');
      store.initChat('chat_abc');

      expect(store.chatId).toBe('chat_abc');
      expect(store.isActive).toBe(true);
      expect(store.messages).toEqual([]);
      expect(store.createdAt).toBeTypeOf('number');
      expect(store.isActiveChat()).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('appends a message and returns it with a timestamp', () => {
      const msg = store.addMessage('user', 'hi');
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('hi');
      expect(msg.timestamp).toBeTypeOf('number');
      expect(store.messages).toHaveLength(1);
    });

    it('preserves insertion order across multiple calls', () => {
      store.addMessage('user', 'first');
      store.addMessage('agent', 'second');
      store.addMessage('user', 'third');
      expect(store.messages.map(m => m.content)).toEqual(['first', 'second', 'third']);
    });
  });

  describe('immutability of getters', () => {
    it('messages getter returns a copy that cannot mutate internal state', () => {
      store.addMessage('user', 'one');
      const copy = store.messages;
      copy.push({ role: 'agent', content: 'sneaky', timestamp: 0 });
      expect(store.messages).toHaveLength(1);
    });

    it('variables getter returns a copy', () => {
      store.setVariable('email', 'a@b.c');
      const copy = store.variables;
      copy.email = 'mutated';
      expect(store.variables.email).toBe('a@b.c');
    });
  });

  describe('setEnded', () => {
    it('flips isActive to false but keeps chatId and messages intact', () => {
      store.initChat('chat_xyz');
      store.addMessage('user', 'hi');
      store.setEnded();

      expect(store.isActive).toBe(false);
      expect(store.isActiveChat()).toBe(false);
      expect(store.chatId).toBe('chat_xyz');
      expect(store.messages).toHaveLength(1);
    });
  });

  describe('variables', () => {
    it('setVariable persists by name', () => {
      store.setVariable('first_name', 'Ana');
      store.setVariable('email', 'a@b.c');
      expect(store.variables).toEqual({ first_name: 'Ana', email: 'a@b.c' });
    });

    it('clearVariables wipes all', () => {
      store.setVariable('first_name', 'Ana');
      store.clearVariables();
      expect(store.variables).toEqual({});
    });
  });

  describe('isRecentlyCreated', () => {
    it('returns a falsy value on fresh store (no createdAt)', () => {
      expect(store.isRecentlyCreated(2000)).toBeFalsy();
    });

    it('returns true right after initChat', () => {
      store.initChat('chat_1');
      expect(store.isRecentlyCreated(2000)).toBe(true);
    });

    it('returns false when the threshold is shorter than elapsed time', () => {
      store.initChat('chat_1');
      // 0ms threshold — by the time we evaluate, more than 0ms has passed
      expect(store.isRecentlyCreated(0)).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears everything back to initial state', () => {
      store.initChat('chat_abc');
      store.addMessage('user', 'hi');
      store.setVariable('first_name', 'Ana');
      store.reset();

      expect(store.chatId).toBeNull();
      expect(store.messages).toEqual([]);
      expect(store.isActive).toBe(false);
      expect(store.variables).toEqual({});
      expect(store.createdAt).toBeNull();
    });
  });
});
