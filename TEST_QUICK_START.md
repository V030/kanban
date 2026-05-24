# TEST EXECUTION QUICK START

## 📋 Overview

This quick reference guide will help you:
1. Run the test suite
2. Interpret results
3. Fix failing tests
4. Add new tests

---

## 🚀 Quick Start

### Install Dependencies
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

### Configure Jest
Create/update `jest.config.js` in project root:
```js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  coverageThreshold: { global: { branches: 70, functions: 80, lines: 75 } },
};
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test auth.edge-cases.test.js

# Run with coverage report
npm test -- --coverage

# Run in watch mode (re-run on file change)
npm test -- --watch

# Run single test by name
npm test -- --testNamePattern="should handle expired token"
```

---

## 📊 Test Suite Overview

| Test File | Tests | Focus Area |
|-----------|-------|-----------|
| `auth.edge-cases.test.js` | 17 | JWT, session, token expiration |
| `authz.rbac.test.js` | 22 | Permissions, roles, privilege escalation |
| `async.race-conditions.test.js` | 19 | Concurrent requests, race conditions |
| `routing.navigation.test.js` | 21 | Deep linking, page refresh, 404s |
| `security.injection.test.js` | 24 | IDOR, XSS, CSRF, injection attacks |
| `sse.notifications.test.js` | 20 | Real-time events, memory leaks, reconnection |

**Total: 123 test scenarios**

---

## 🔍 Understanding Test Results

### ✅ All Tests Passing
- Confidence level: **HIGH**
- Ready for: Code review, staging deployment
- Next step: Manual testing before production

### ⚠️ Some Tests Failing
- Review failures in order: CRITICAL → HIGH → MEDIUM
- Fix root cause (not just test symptoms)
- Re-run to verify fix
- Example: If "IDOR" test fails, server isn't validating project membership

### ❌ Multiple Failures in Same Category
- Indicates architectural issue, not isolated bug
- Example: All "Stale Permissions" tests fail → need permission refresh mechanism
- Escalate to team lead for architectural review

---

## 🛠️ Fixing Failing Tests

### Process
1. **Identify**: Read test name and failure message
2. **Understand**: Check test file to see what's being tested
3. **Fix**: Implement feature/fix in source code
4. **Verify**: Re-run test to confirm fix
5. **Regress**: Run full suite to catch side effects

### Common Failures

#### "No token found"
- **Cause**: Test didn't set `localStorage.token`
- **Fix**: Add `localStorage.setItem('token', 'test-token')` in test setup

#### "fetch is not a function"
- **Cause**: `global.fetch` mock not initialized
- **Fix**: Ensure `tests/setup.ts` runs before tests

#### "Component rendered with stale state"
- **Cause**: Async operations didn't complete before assertion
- **Fix**: Use `await waitFor(() => { expect(...) })`

#### "403 Forbidden when should be 200"
- **Cause**: Server permission check failing
- **Fix**: Verify user has required role in test; check authorization middleware

---

## 📝 Adding New Tests

### 1. Choose Test File
- Auth issue? → `auth.edge-cases.test.js`
- Permission issue? → `authz.rbac.test.js`
- Race condition? → `async.race-conditions.test.js`
- New category? → Create `tests/new-category.test.js`

### 2. Use Test Template
```typescript
describe('Category Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  describe('Specific Scenario', () => {
    it('should do X when Y happens', async () => {
      // Setup
      const expected = 'result';

      // Mock
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ data: expected }),
      });

      // Execute
      const result = await someAction();

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

### 3. Use Helpers from `setup.test-utilities.ts`
```typescript
import { testHelpers, factories, mockResponses } from './setup.test-utilities';

it('should work', async () => {
  // Setup auth
  testHelpers.setupAuth();

  // Use factory
  const user = factories.user({ role: 'admin' });

  // Mock response
  testHelpers.mockFetch(mockResponses.forbidden());

  // Assert fetch called with auth header
  testHelpers.assertAuthHeader();
});
```

### 4. Run New Test
```bash
npm test -- new-test.test.js
```

---

## 📈 Coverage Goals

### Target Thresholds
- **Lines**: 75%+ (most code paths executed)
- **Branches**: 70%+ (if/else conditions)
- **Functions**: 80%+ (all functions called)
- **Statements**: 75%+ (all statements run)

### Generate Coverage Report
```bash
npm test -- --coverage

# Output locations:
# - coverage/index.html (open in browser)
# - coverage/lcov-report/ (detailed breakdown)
```

### Improve Coverage
1. Identify uncovered lines: `coverage/index.html`
2. Understand why untested (dead code? untestable?)
3. Add tests for critical paths
4. Use `skip` / `only` during debugging:
   ```typescript
   it.skip('will run later', () => {});
   it.only('only this runs', () => {});
   ```

---

## 🚨 Critical Path Tests

Always verify these pass before any deployment:

- [ ] `auth.edge-cases.test.js` → "JWT Expiration Mid-Async"
- [ ] `authz.rbac.test.js` → "Cross-Project Task Access (IDOR)"
- [ ] `async.race-conditions.test.js` → "Concurrent Edits"
- [ ] `security.injection.test.js` → "IDOR Vulnerabilities"
- [ ] `sse.notifications.test.js` → "Listener Cleanup"

If any fail → **DO NOT DEPLOY** → Fix before retry

---

## 🔐 Debugging Tips

### Debug Single Test
```bash
# Run with Node debugger
node --inspect-brk ./node_modules/.bin/jest --testNamePattern="specific test"

# Then open: chrome://inspect
```

### Print Debug Info
```typescript
it('debug test', () => {
  console.log('Auth token:', localStorage.getItem('token'));
  console.log('Fetch calls:', global.fetch.mock.calls);
  expect(true).toBe(true);
});
```

### Mock with Side Effects
```typescript
global.fetch.mockImplementation(async (url) => {
  console.log('Fetch called with:', url);
  if (url.includes('tasks')) {
    return { status: 200, ok: true, json: async () => ({}) };
  }
  return { status: 404, ok: false, json: async () => ({}) };
});
```

---

## 📚 Resources

### Jest Documentation
- https://jestjs.io/docs/getting-started
- https://jestjs.io/docs/mock-functions

### React Testing Library
- https://testing-library.com/react
- https://testing-library.com/queries/

### Common Patterns
- **Async/await**: `await waitFor(() => expect(...).toBe(...))`
- **Mock setup**: Use `beforeEach()` for common setup
- **Assertions**: `expect(value).toBe(expected)`

---

## ✅ Pre-Production Checklist

Before deploying to production:
- [ ] Run full test suite: `npm test`
- [ ] All 123 tests passing
- [ ] Coverage > 75% on critical paths
- [ ] No skipped tests (`it.skip`)
- [ ] Manual testing completed
- [ ] Security audit passed
- [ ] Performance testing done

---

## 🆘 Support

### Stuck on Test?
1. Read test file to understand intent
2. Check `setup.test-utilities.ts` for helpers
3. Review similar passing test
4. Debug with `console.log()` + re-run
5. Escalate to team lead if stuck > 30 min

### Test is Flaky (passes/fails randomly)?
- **Likely cause**: Race condition, timing, mock not reset
- **Fix**: Add `beforeEach()` cleanup, use `jest.useFakeTimers()`
- **Verify**: Run test 10x in a row: `for i in {1..10}; do npm test --testNamePattern="test name"; done`

---

**Happy testing! 🎉**

Last updated: 2024-01-01
