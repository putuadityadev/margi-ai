import '@testing-library/jest-dom/vitest';
import * as matchers from 'vitest-axe/matchers';
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useStreamStore } from '../stores/streamStore';
import { useAnalyzerStore } from '../stores/analyzerStore';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  useStreamStore.getState().reset();
  useAnalyzerStore.getState().reset();
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Polyfill HTMLDialogElement for jsdom
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
}

// Polyfill EventSource for MSW SSE in jsdom / Node
if (typeof globalThis.EventSource === 'undefined') {
  class MockEventSource extends EventTarget {
    url: string;
    withCredentials = false;
    readyState = 0;
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    onopen: ((this: MockEventSource, ev: Event) => unknown) | null = null;
    onmessage: ((this: MockEventSource, ev: MessageEvent) => unknown) | null = null;
    onerror: ((this: MockEventSource, ev: Event) => unknown) | null = null;

    constructor(url: string | URL) {
      super();
      this.url = String(url);
    }

    close(): void {
      this.readyState = this.CLOSED;
    }
  }

  // @ts-expect-error Mock polyfill for test environment
  globalThis.EventSource = MockEventSource;
}
