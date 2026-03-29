# E2E Tests for LeadFlowPro

End-to-end tests using Playwright to verify core user flows.

## Test Coverage

- **auth.spec.ts** — Login, logout, session persistence
- **campaigns.spec.ts** — Campaign CRUD, filtering, status changes, CSV export
- **leads.spec.ts** — Leads list, filtering, search, status updates, CSV export
- **billing.spec.ts** — Billing page, subscription info, usage metrics

## Prerequisites

1. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

2. Ensure database connectivity is configured in `apps/api/.env`:
   - `DATABASE_URL` must point to a reachable PostgreSQL instance
   - `PORT` should be `3000` for local development

3. Ensure test data can be seeded:
   - Use credentials: `admin@acme.test` / `password`
   - Seed command: `npm -w apps/api run seed:test-user`

4. API and Web servers are started automatically by Playwright config.
   Optional manual start:
   ```bash
   npm -w apps/api run dev
   npm -w apps/web run dev
   ```

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run in debug mode
```bash
npx playwright test --debug
```

### Open HTML report
```bash
npx playwright show-report
```

### Run tests headed (see browser)
```bash
npx playwright test --headed
```

## Test Configuration

- **Base URL**: `http://localhost:5173`
- **Browsers**: Chromium and Firefox
- **Timeout**: 30 seconds per test
- **Retries**: 0 (local), 2 (CI)
- **Screenshot**: On failure only
- **Trace**: On first retry

## Helper Functions

Use helpers from `e2e/helpers.ts`:

```typescript
import { login, logout, waitForToast, downloadFile } from './helpers';

// Login with test user
await login(page);

// Wait for success toast
await waitForToast(page, 'created successfully');

// Download a file
const download = await downloadFile(page, 'button:has-text("Export")');
```

## Test Data

Default test user (seeded in database):
- Email: `admin@acme.test`
- Password: `password`
- Tenant: `demo-tenant-d8cyli`
- Company: Acme Corp

Available test data:
- 40 leads across 3 campaigns
- 3 campaigns (Google, LinkedIn, Meta)
- 25 call logs
- Multiple users (admin, sales1, sales2)

## CI/CD Integration

In CI environment:
- Runs with `CI=true`
- Uses headless mode
- Retries failed tests 2 times
- Workers limited to 1
- Generates HTML report

## Debugging

1. **Visual debugging**: Use `--headed` flag to see browser
2. **Debug mode**: Use `--debug` for step-by-step execution
3. **Screenshots**: Check `test-results/` for failure screenshots
4. **Traces**: Enable with `--trace on` to record traces
5. **Browser DevTools**: Use `page.pause()` to stop execution

## Common Issues

1. **Port already in use**: Kill process on port 5173 or 3000
2. **Seed failed before tests start**: Check `DATABASE_URL` in `apps/api/.env` and run `npm -w apps/api run seed:test-user`
3. **Timeout errors**: Increase timeout or check network requests
4. **Element not found**: Use `page.pause()` to debug selectors

## Tips

- Use `page.locator()` for more reliable element selection
- Avoid hard timeouts—use `waitFor()` methods instead
- Always wait for navigation after form submissions
- Test with different viewport sizes using `page.setViewportSize()`
- Use `--max-failures=1` to stop on first failure
