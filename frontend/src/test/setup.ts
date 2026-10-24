import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebGL context if needed in jsdom environment
if (typeof window !== 'undefined') {
  // Mock matchMedia for prefers-reduced-motion testing
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver for JSDOM
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    disconnect = vi.fn();
    observe = vi.fn();
    takeRecords = vi.fn().mockReturnValue([]);
    unobserve = vi.fn();
    constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  // Mock HTMLCanvasElement.getContext for basic canvas calls
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function (contextType: string, options?: unknown) {
    if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
      return null; // Return null in JSDOM to test graceful fallback
    }
    if (contextType === '2d') {
      return {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        globalAlpha: 1,
      };
    }
    try {
      return (originalGetContext as any).call(this, contextType, options);
    } catch {
      return null;
    }
  };
}
