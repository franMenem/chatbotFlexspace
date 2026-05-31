import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../public/src/utils/EventBus.js';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('invokes the listener with the emitted payload', () => {
      const handler = vi.fn();
      bus.on('msg', handler);
      bus.emit('msg', { text: 'hi' });
      expect(handler).toHaveBeenCalledWith({ text: 'hi' });
    });

    it('invokes multiple listeners registered for the same event', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('msg', a);
      bus.on('msg', b);
      bus.emit('msg', 1);
      expect(a).toHaveBeenCalledWith(1);
      expect(b).toHaveBeenCalledWith(1);
    });

    it('does not invoke listeners for other events', () => {
      const handler = vi.fn();
      bus.on('msg', handler);
      bus.emit('other', 'x');
      expect(handler).not.toHaveBeenCalled();
    });

    it('emit on an unknown event is a no-op (does not throw)', () => {
      expect(() => bus.emit('ghost', 1)).not.toThrow();
    });
  });

  describe('off', () => {
    it('removes a listener so subsequent emits skip it', () => {
      const handler = vi.fn();
      bus.on('msg', handler);
      bus.off('msg', handler);
      bus.emit('msg', 'ignored');
      expect(handler).not.toHaveBeenCalled();
    });

    it('the unsubscribe function returned by on() removes the listener', () => {
      const handler = vi.fn();
      const unsubscribe = bus.on('msg', handler);
      unsubscribe();
      bus.emit('msg', 'ignored');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('fires the listener at most once', () => {
      const handler = vi.fn();
      bus.once('msg', handler);
      bus.emit('msg', 1);
      bus.emit('msg', 2);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });
  });

  describe('listener isolation', () => {
    it('an error thrown by one listener does not block the others', () => {
      const failing = vi.fn(() => { throw new Error('boom'); });
      const ok = vi.fn();
      bus.on('msg', failing);
      bus.on('msg', ok);

      expect(() => bus.emit('msg', 1)).not.toThrow();
      expect(failing).toHaveBeenCalled();
      expect(ok).toHaveBeenCalledWith(1);
    });
  });

  describe('clear', () => {
    it('clear(event) removes all listeners for that event only', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('msg', a);
      bus.on('other', b);
      bus.clear('msg');

      bus.emit('msg', 1);
      bus.emit('other', 2);

      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledWith(2);
    });

    it('clear() with no args wipes all events', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('msg', a);
      bus.on('other', b);
      bus.clear();

      bus.emit('msg', 1);
      bus.emit('other', 2);

      expect(a).not.toHaveBeenCalled();
      expect(b).not.toHaveBeenCalled();
    });
  });

  describe('hasListeners', () => {
    it('returns false for events with no listeners', () => {
      expect(bus.hasListeners('msg')).toBe(false);
    });

    it('returns true while a listener is registered, false after off', () => {
      const handler = vi.fn();
      bus.on('msg', handler);
      expect(bus.hasListeners('msg')).toBe(true);
      bus.off('msg', handler);
      expect(bus.hasListeners('msg')).toBe(false);
    });
  });
});
