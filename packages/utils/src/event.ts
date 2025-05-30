import { debounceMicrotask } from './debounce';

export type EventMap = Record<string, unknown>;
export type EventKey<T> = string & keyof T;
export type EventReceiver<T> = (params: T) => void;

export interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
}

export class EventEmitter<T extends EventMap> implements Emitter<T> {
  private listeners: {
    [K in keyof T]?: Array<[EventReceiver<T[K]>, EventReceiver<T[K]>]>;
  } = {};

  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.listeners[eventName] = (this.listeners[eventName] ?? []).concat([
      [fn, debounceMicrotask(fn)]
    ]);
  }

  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.listeners[eventName] = (this.listeners[eventName] ?? []).filter(f => f[0] !== fn);
  }

  emitAsync<K extends EventKey<T>>(eventName: K, params?: T[K]) {
    (this.listeners[eventName] ?? []).forEach(function (fn) {
      fn[1]({ ...(params ?? {}) } as T[K]);
    });
  }

  emit<K extends EventKey<T>>(eventName: K, params?: T[K]) {
    (this.listeners[eventName] ?? []).forEach(function (fn) {
      fn[0]({ ...(params ?? {}) } as T[K]);
    });
  }
}
