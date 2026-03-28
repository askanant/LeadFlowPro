import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'admin@acme.test',
  password: 'password',
};

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Check login page loads
    await expect(page.locator('h1')).toContainText('Sign in');

    // Fill credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit login
    await page.click('button:has-text("Sign in")');

    // Should redirect to dashboard or portal
    await page.waitForURL(/\/(portal)?$/);
    await expect(page).not.toHaveURL('/login');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit login
    await page.click('button:has-text("Sign in")');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/(portal)?$/, { timeout: 30000 });

    // Click logout button
    await page.getByRole('button', { name: 'Log out' }).click();

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Sign in');
  });

  test('should persist session on page refresh', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/(portal)?$/, { timeout: 30000 });

    // Refresh page
    await page.reload();

    // Should remain logged in (not redirected to login)
    await page.waitForURL(/\/(portal)?$/, { timeout: 10000 });
    await expect(page).not.toHaveURL('/login');
  });
});
