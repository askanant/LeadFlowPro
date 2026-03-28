import { Page } from '@playwright/test';

export const TEST_USER = {
  email: 'admin@acme.test',
  password: 'password',
};

export const TEST_USERS = {
  admin: TEST_USER,
  sales1: {
    email: 'sales1@acme.test',
    password: 'password',
  },
  sales2: {
    email: 'sales2@acme.test',
    password: 'password',
  },
};

export async function login(page: Page, user = TEST_USER) {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button:has-text("Sign in")');
  // Wait for navigation - could be / for super_admin or /portal for company_admin
  await page.waitForURL(/\/(portal)?(\/.*)?$/);
}

export async function logout(page: Page) {
  // Try different logout button selectors
  const buttons = [
    'button[aria-label*="menu"], button[aria-label*="Settings"]',
    'button:has-text("Logout")',
    '[role="menuitem"]:has-text("Logout")',
  ];

  for (const selector of buttons) {
    if (await page.locator(selector).isVisible()) {
      await page.click(selector);
      break;
    }
  }

  await page.waitForURL('/login');
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export async function waitForToast(page: Page, text: string) {
  const toast = page.locator('[role="alert"]').filter({ hasText: text });
  await toast.waitFor({ timeout: 5000 });
  return toast;
}

export async function expectTableRow(page: Page, text: string) {
  const row = page.locator('tbody tr').filter({ hasText: text });
  await row.waitFor({ timeout: 5000 });
  return row;
}

export async function downloadFile(page: Page, buttonSelector: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.click(buttonSelector);
  const download = await downloadPromise;
  return download;
}
