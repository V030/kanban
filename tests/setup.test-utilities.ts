/**
 * TEST SETUP & MOCKING STRATEGY
 * 
 * This file documents the global test configuration, mock setup,
 * and utilities used across all production readiness tests.
 * 
 * Use this as a reference for adding new tests or modifying existing ones.
 */

// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 75,
      statements: 75,
    },
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-router-dom)/)',
  ],
};

// tests/setup.ts
import '@testing-library/jest-dom';

// Global mock for localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Global mock for fetch
global.fetch = jest.fn();

// Global mock for EventSource
class MockEventSource {
  url: string;
  readyState = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;

  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(url: string) {
    this.url = url;
    this.readyState = this.CONNECTING;
  }

  addEventListener(event: string, handler: (event: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: (event: any) => void) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  close() {
    this.readyState = this.CLOSED;
    this.listeners.clear();
  }

  _trigger(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        handler({ data: JSON.stringify(data) });
      });
    }
  }

  dispatchEvent(event: Event) {
    // Support standard event dispatch
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
    return true;
  }
}

Object.defineProperty(global, 'EventSource', {
  writable: true,
  value: MockEventSource,
});

// Suppress console errors during tests (add to .env.test)
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  localStorage.clear();
});

// ============================================================
// MOCK UTILITIES & FACTORIES
// ============================================================

/**
 * Mock API responses for common scenarios
 */
export const mockResponses = {
  /**
   * Successful login response
   */
  successLogin: (overrides?: any) => ({
    status: 200,
    ok: true,
    json: async () => ({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEiLCJyb2xlIjoibWVtYmVyIn0.sig',
      user: {
        id: 'user-1',
        email: 'user@test.com',
        role: 'member',
        firstName: 'Test',
        lastName: 'User',
        ...overrides,
      },
    }),
  }),

  /**
   * 401 Unauthorized (expired token, invalid credentials)
   */
  unauthorized: (message = 'Unauthorized') => ({
    status: 401,
    ok: false,
    json: async () => ({ message }),
  }),

  /**
   * 403 Forbidden (permission denied)
   */
  forbidden: (message = 'Forbidden: you do not have permission') => ({
    status: 403,
    ok: false,
    json: async () => ({ message }),
  }),

  /**
   * 404 Not Found (resource deleted or nonexistent)
   */
  notFound: (message = 'Not found') => ({
    status: 404,
    ok: false,
    json: async () => ({ message }),
  }),

  /**
   * 400 Bad Request (validation error)
   */
  badRequest: (message = 'Invalid request') => ({
    status: 400,
    ok: false,
    json: async () => ({ message }),
  }),

  /**
   * 500 Server Error
   */
  serverError: (message = 'Server error') => ({
    status: 500,
    ok: false,
    json: async () => ({ message }),
  }),

  /**
   * Network error (TypeError)
   */
  networkError: () => {
    const error = new TypeError('Network error');
    error.name = 'TypeError';
    throw error;
  },
};

/**
 * Mock data factories
 */
export const factories = {
  user: (overrides?: any) => ({
    id: 'user-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'member',
    ...overrides,
  }),

  project: (overrides?: any) => ({
    id: 'proj-1',
    name: 'Test Project',
    description: 'Test project description',
    owner: 'user-1',
    ...overrides,
  }),

  task: (overrides?: any) => ({
    id: 50,
    title: 'Test Task',
    description: 'Task description',
    projectId: 'proj-1',
    status: 'todo',
    assignees: [],
    createdBy: 'user-1',
    ...overrides,
  }),

  token: (payload?: any) => ({
    userId: 'user-1',
    role: 'member',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  }),
};

/**
 * Test helper functions
 */
export const testHelpers = {
  /**
   * Setup authenticated session
   */
  setupAuth: (token = 'valid-token', user = factories.user()) => {
    localStorage.setItem('token', token);
    return { token, user };
  },

  /**
   * Clear authentication
   */
  clearAuth: () => {
    localStorage.clear();
  },

  /**
   * Mock fetch with preset response
   */
  mockFetch: (response: any) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response);
  },

  /**
   * Mock fetch to fail with error
   */
  mockFetchError: (error: Error) => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(error);
  },

  /**
   * Simulate token expiration
   */
  expireToken: () => {
    localStorage.removeItem('token');
  },

  /**
   * Wait for pending promises
   */
  flushPromises: () => {
    return new Promise((resolve) => setImmediate(resolve));
  },

  /**
   * Mock EventSource for testing
   */
  createMockEventSource: (url: string) => {
    return new (global.EventSource as any)(url);
  },

  /**
   * Assert fetch called with specific auth header
   */
  assertAuthHeader: () => {
    const calls = (global.fetch as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    const options = lastCall?.[1];
    expect(options?.headers?.Authorization).toMatch(/Bearer /);
  },

  /**
   * Assert fetch was called (used for side effect testing)
   */
  assertFetchCalled: (url?: string) => {
    if (url) {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(url),
        expect.any(Object)
      );
    } else {
      expect(global.fetch).toHaveBeenCalled();
    }
  },

  /**
   * Assert fetch was NOT called
   */
  assertFetchNotCalled: () => {
    expect(global.fetch).not.toHaveBeenCalled();
  },
};

// ============================================================
// COMMON TEST PATTERNS
// ============================================================

/**
 * Example: Testing authenticated request with error handling
 */
export const exampleAuthenticatedTest = () => {
  // Setup
  const { token } = testHelpers.setupAuth();

  // Mock API response
  testHelpers.mockFetch(mockResponses.unauthorized());

  // Execute & Assert
  // await expect(someAuthenticatedAction()).rejects.toThrow();
};

/**
 * Example: Testing permission check
 */
export const examplePermissionTest = () => {
  // Setup
  testHelpers.setupAuth();

  // Mock unauthorized response
  testHelpers.mockFetch(mockResponses.forbidden('Only owners can delete projects'));

  // Execute & Assert
  // await expect(deleteProject('proj-1')).rejects.toThrow();
  testHelpers.assertAuthHeader();
};

/**
 * Example: Testing race condition
 */
export const exampleRaceConditionTest = () => {
  testHelpers.setupAuth();

  let callOrder: string[] = [];

  (global.fetch as jest.Mock)
    .mockImplementationOnce(async () => {
      callOrder.push('call1');
      return { status: 200, ok: true, json: async () => ({}) };
    })
    .mockImplementationOnce(async () => {
      callOrder.push('call2');
      return { status: 200, ok: true, json: async () => ({}) };
    });

  // Execute concurrent requests
  // await Promise.all([request1(), request2()]);

  // Assert: verify correct handling (not just order)
  // expect(callOrder).toEqual(['call1', 'call2']);
};

// ============================================================
// ENVIRONMENT VARIABLES FOR TESTS
// ============================================================

/**
 * .env.test configuration
 * 
 * REACT_APP_API_URL=http://localhost:5000
 * REACT_APP_GOOGLE_CLIENT_ID=test-client-id
 * NODE_ENV=test
 */

// ============================================================
// RUNNING TESTS
// ============================================================

/**
 * npm test -- tests/
 *   Run all tests
 *
 * npm test -- tests/auth.edge-cases.test.js
 *   Run specific test file
 *
 * npm test -- --watch
 *   Run in watch mode
 *
 * npm test -- --coverage
 *   Generate coverage report
 *
 * npm test -- --coverage --collectCoverageFrom=\"src/**\"
 *   Coverage for specific path
 *
 * npm test -- --testNamePattern=\"should handle expired token\"
 *   Run specific test by name
 *
 * npm test -- --bail
 *   Stop on first failure
 */

export {};
