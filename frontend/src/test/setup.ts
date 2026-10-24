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

  // Mock HTMLCanvasElement.getContext for basic canvas calls
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error Mocking canvas context for testing environment
  HTMLCanvasElement.prototype.getContext = function (contextType: string, options?: unknown) {
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
      return originalGetContext.call(this, contextType, options);
    } catch {
      return null;
    }
  };
}
