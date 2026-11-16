import { expect, test } from '@playwright/test';
import { openSignIn, openWorkspace } from './workspace-fixture.mjs';

const clinic = (page, id) => page.locator(`input[name="call-state"][value="${id}"] + span`);
const treatment = (page, id) => page.locator(`[data-treatment-guide="${id}"]`);

test('staff sign-in, password visibility and sign-out keep the workspace gated', async ({ page }) => {
  await openSignIn(page, 'light');
  await expect(page.locator('.workspace-shell')).toBeHidden();
  const password = page.locator('#sign-in-password');
  await password.fill('fixture-only');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('textbox', { name: 'Email' }).fill('alex@example.test');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#staff-account')).toHaveText('Alex · Advisor');
  const account = page.getByRole('button', { name: 'Account options' });
  await account.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#workspace-account-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#workspace-account-menu')).toBeHidden();
  await expect(account).toBeFocused();
  await account.click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.workspace-shell')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
});

test('guide keeps clinic pricing, treatment selection and browser history', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openWorkspace(page, 'light');
  await clinic(page, 'CHELSEA').click();
  await expect(page.locator('#context-phone')).toHaveText('212-555-0103');
  await expect(page.locator('.guide-facts')).toContainText('$400 per session');
  await clinic(page, 'NJ').click();
  await expect(page.locator('.guide-facts')).toContainText('$475 per session');
  await expect(page.locator('.guide-facts')).not.toContainText('$400');
  await clinic(page, 'FL').click();
  await expect(page.locator('.guide-facts')).toContainText('No IVK pricing listed');
  await treatment(page, 'spravato').click();
  await expect(treatment(page, 'spravato')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.guide-facts')).toContainText('Observation');
  await treatment(page, 'tms').click();
  await expect(page.locator('.guide-heading h3')).toContainText('TMS');
  await page.getByRole('button', { name: 'Clinic insurance rules' }).click();
  await expect(page).toHaveURL(/#insurance-title$/);
  await page.goBack();
  await expect(page.locator('.guide-heading h3')).toContainText('TMS');
  await page.goForward();
  await expect(page.locator('#workspace-view-title')).toHaveText('Insurance');
  expect(errors).toEqual([]);
});

test('search shortcut and workspace preferences survive navigation and reload', async ({ page }) => {
  await openWorkspace(page, 'light');
  await clinic(page, 'CHELSEA').click();
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await page.getByRole('button', { name: 'Account options' }).click();
  const themeSwitch = page.getByRole('switch', { name: 'Dark mode' });
  await themeSwitch.focus();
  await page.keyboard.press('Space');
  await expect(themeSwitch).toBeChecked();
  await page.keyboard.press('Escape');
  await page.locator('#workspace-main').focus();
  await page.keyboard.press('/');
  const search = page.getByRole('searchbox', { name: 'Search the workspace' });
  await expect(search).toBeFocused();
  await search.fill('Spravato');
  await expect(page.locator('#workspace-search-results')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#workspace-search-results')).toBeHidden();
  await search.fill('Spravato');
  await page.locator('#workspace-search-items').getByRole('button', { name: /^Spravato/ }).first().click();
  await expect(treatment(page, 'spravato')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('input[value="CHELSEA"]')).toBeChecked();
});

test('messages keep the existing sort choices, card drag and selected preview', async ({ page }) => {
  await openWorkspace(page, 'dark', 'messages-title');
  const sort = page.locator('#message-sort');
  const cards = page.locator('#messages-grid [data-select-message]');
  await expect(cards.first()).toBeVisible();
  await expect(sort).toHaveValue('default');
  await expect(cards.first()).toHaveAttribute('draggable', 'true');
  const second = await cards.nth(1).textContent();
  await cards.first().dragTo(cards.nth(1));
  await expect(cards.first()).toHaveText(second);
  await cards.first().click();
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'true');
  await sort.selectOption('most-copied');
  await expect(page.locator('#messages-grid [draggable]')).toHaveCount(0);
  await sort.selectOption('default');
  await expect(cards.first()).toHaveText(second);
});

test('message personalisation keeps the modal and clipboard action', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openWorkspace(page, 'light', 'messages-title');
  const copy = page.getByRole('button', { name: 'Personalise & copy' });
  await copy.click();
  await expect(page.locator('#toast')).toHaveText('Select a clinic at the top to use its phone number.');
  await clinic(page, 'CHELSEA').click();
  await copy.click();
  const form = page.getByRole('dialog', { name: 'Personalise message' });
  await expect(form).toBeVisible();
  await expect(form.getByLabel('Patient name')).toBeFocused();
  await form.getByLabel('Patient name').fill('Test Patient');
  await form.getByRole('button', { name: 'Copy Message' }).click();
  await expect(form).toBeHidden();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Hi Test Patient,');
  expect(copied).toContain('Alex');
});

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 768 }]) {
    test(`Treatment Guide ${theme} at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await openWorkspace(page, theme);
      await clinic(page, 'CHELSEA').click();
      await expect(page.locator('.guide-facts')).toContainText('$400 per session');
      await expect(page.locator('#context-phone')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      const name = `treatment-${theme}-${viewport.width}.png`;
      if (process.platform === 'darwin') {
        await expect(page).toHaveScreenshot(name, { fullPage: true });
      } else {
        await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
      }
    });
  }
}
