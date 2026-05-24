/**
 * AUTHENTICATION EDGE CASE TESTS
 * 
 * Purpose: Validate token management, expiration handling, and auth flow resilience
 * Risk Level: HIGH
 * 
 * These tests verify that the app handles authentication failures gracefully
 * and doesn't leave users in inconsistent states during token expiration,
 * malformed tokens, or network failures.
 */

import * as authService from '../src/services/authService';
import { isAuthenticated, getToken, logout } from '../src/services/authService';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

describe('Authentication Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('A1: JWT Expiration Mid-Async', () => {
    it('should detect 401 response and redirect to login', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImV4cCI6MTAwfQ.sig';
      localStorage.setItem('token', token);

      // Mock API response: 401 (token expired)
      global.fetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ message: 'Token expired' }),
      });

      try {
        await authService.fetchWithAuth('http://localhost:5000/auth/projects/my-projects', {
          method: 'GET',
        });
      } catch (error) {
        expect(error.message).toContain('expired');
      }

      // Token should be cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should handle logout on 401 response', async () => {
      const token = 'valid-token';
      localStorage.setItem('token', token);

      global.fetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      });

      try {
        await authService.fetchWithAuth('http://localhost:5000/auth/projects/my-projects');
      } catch (e) {
        // Expected
      }

      // Verify logout called (token removed)
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('A2: Missing or Malformed JWT', () => {
    it('should throw error if no token found', async () => {
      localStorage.clear();

      await expect(
        authService.fetchWithAuth('http://localhost:5000/auth/projects/my-projects')
      ).rejects.toThrow('No token found');
    });

    it('should detect malformed JWT on first API call', async () => {
      const malformedToken = 'not.a.valid.jwt';
      localStorage.setItem('token', malformedToken);

      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({ message: 'Invalid token' }),
      });

      await expect(
        authService.fetchWithAuth('http://localhost:5000/auth/projects/my-projects')
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('A3: Session Expiration During Active Usage', () => {
    it('should detect stale token after clock skew', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImV4cCI6OTk5fQ.sig'; // Exp time in past
      localStorage.setItem('token', expiredToken);

      // First request succeeds (client doesn't validate expiration)
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ projects: [] }),
      });

      const result = await authService.fetchWithAuth('http://localhost:5000/auth/projects/my-projects');
      expect(result).toBeDefined();

      // Second request: server detects expired token
      global.fetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ message: 'Token expired' }),
      });

      await expect(
        authService.fetchWithAuth('http://localhost:5000/auth/tasks')
      ).rejects.toThrow('Session expired');
    });
  });

  describe('A4: Logout While Async Request Pending', () => {
    it('should not use stale token for orphaned requests', async () => {
      const token = 'valid-token';
      localStorage.setItem('token', token);

      // Start async request
      let resolveRequest: any;
      global.fetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
      );

      const createTaskPromise = authService.fetchWithAuth('http://localhost:5000/auth/projects/proj1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Task' }),
      });

      // Logout immediately
      logout();

      // Resolve the pending request with 401
      resolveRequest({
        status: 401,
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(createTaskPromise).rejects.toThrow('Session expired');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('A5: Duplicate Login State', () => {
    it('should overwrite previous token on new login', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';

      localStorage.setItem('token', oldToken);
      expect(localStorage.getItem('token')).toBe(oldToken);

      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          token: newToken,
          user: { id: 'user-1', email: 'user@test.com', role: 'member' },
        }),
      });

      await authService.login('user@test.com', 'password');

      // Token should be updated
      expect(localStorage.setItem).toHaveBeenCalledWith('token', newToken);
    });

    it('should handle rapid login attempts without race condition', async () => {
      const token1 = 'token-1';
      const token2 = 'token-2';

      global.fetch
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            token: token1,
            user: { id: 'user-1', email: 'a@test.com', role: 'member' },
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            token: token2,
            user: { id: 'user-2', email: 'b@test.com', role: 'member' },
          }),
        });

      const login1 = authService.login('a@test.com', 'pass1');
      const login2 = authService.login('b@test.com', 'pass2');

      await Promise.all([login1, login2]);

      // Only the last token should be stored
      expect(localStorage.setItem).toHaveBeenLastCalledWith('token', token2);
    });
  });

  describe('A6: isAuthenticated() Client-Side Check', () => {
    it('should return true only if valid token exists in localStorage', () => {
      localStorage.clear();
      expect(isAuthenticated()).toBe(false);

      localStorage.setItem('token', 'valid-token');
      expect(isAuthenticated()).toBe(true);

      localStorage.removeItem('token');
      expect(isAuthenticated()).toBe(false);
    });

    it('should not validate token signature on client', () => {
      // This is acceptable—server validates. But tests should verify server-side validation.
      const invalidSignatureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.invalid-sig';
      localStorage.setItem('token', invalidSignatureToken);

      expect(isAuthenticated()).toBe(true); // Client sees token, doesn't validate

      // But API should reject it
      global.fetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({ message: 'Invalid token' }),
      });

      return expect(
        authService.fetchWithAuth('http://localhost:5000/auth/projects')
      ).rejects.toThrow();
    });
  });

  describe('A7: Network Failure Detection', () => {
    it('should detect network errors and dispatch redirect event', async () => {
      localStorage.setItem('token', 'valid-token');

      const eventSpy = jest.spyOn(window, 'dispatchEvent');
      global.fetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(
        authService.fetchWithAuth('http://localhost:5000/auth/projects')
      ).rejects.toThrow();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'kanban:network-error' })
      );

      eventSpy.mockRestore();
    });
  });

  describe('A8: getCurrentUser() Stale Cache', () => {
    it('should cache user in-memory and reflect role', () => {
      const user = { id: 'user-1', role: 'member' };

      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          token: 'token',
          user,
        }),
      });

      authService.login('user@test.com', 'password');

      // After login, getCurrentUser should reflect cached user
      expect(authService.getCurrentUser()).toEqual(expect.objectContaining({ role: 'member' }));
    });

    it('should not reflect server-side role changes until re-login', async () => {
      let cachedUser = { id: 'user-1', role: 'member' };

      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          token: 'token',
          user: cachedUser,
        }),
      });

      await authService.login('user@test.com', 'password');

      // Simulate server promoting user to admin
      cachedUser = { ...cachedUser, role: 'admin' };

      // Client cache still shows member (STALE)
      expect(authService.getCurrentUser().role).toBe('member');

      // Only after re-login would it update
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          token: 'new-token',
          user: cachedUser,
        }),
      });

      await authService.login('user@test.com', 'password');
      expect(authService.getCurrentUser().role).toBe('admin');
    });
  });
});
