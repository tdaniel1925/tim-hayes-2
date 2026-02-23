# E2E Tests with Playwright

## Setup

Playwright is already installed in the project. To install browsers:

```bash
npx playwright install chromium
```

## Running Tests

1. **Start the development server** (in a separate terminal):
   ```bash
   npm run dev
   ```

2. **Run the E2E tests**:
   ```bash
   npm run test:e2e
   ```

3. **Run tests with UI** (interactive mode):
   ```bash
   npm run test:e2e:ui
   ```

4. **Run tests in headed mode** (see browser):
   ```bash
   npm run test:e2e:headed
   ```

## Test Files

- `auth.spec.ts` - Authentication and login tests
- `user-management.spec.ts` - User management UI tests

## Notes

- Tests expect the dev server to be running on `http://localhost:3000`
- Full E2E tests that require authentication need a seeded database with test credentials
- Current tests focus on UI structure and basic navigation
