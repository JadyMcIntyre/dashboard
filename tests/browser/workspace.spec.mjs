import { expect, test } from '@playwright/test';
import { openSignIn, openWorkspace } from './workspace-fixture.mjs';

const clinic = (page, id) => page.locator(`input[name="call-state"][value="${id}"] + span`);
const treatment = (page, id) => page.locator(`[data-treatment-guide="${id}"]`);

test('managers can switch between management and advisor views', async ({ page }) => {
  await page.addInitScript(() => { window.fixtureStaffRole = 'manager'; });
  await openWorkspace(page, 'light', 'messages-title');
  const nav = page.getByRole('navigation', { name: 'Workspace tools' });
  const account = page.getByRole('button', { name: 'Account options' });
  const mode = page.getByLabel('Workspace view');
  await expect(page).toHaveURL(/#insurance-title$/);
  await expect(nav.getByRole('link', { name: 'Messages', exact: true })).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Voicemail scripts', exact: true })).toBeHidden();
  await page.keyboard.press('Control+k');
  await page.locator('#workspace-search').fill('Clinic callback');
  await expect(page.getByRole('option')).toHaveCount(0);
  await page.keyboard.press('Escape');

  await nav.getByRole('link', { name: 'Advisor hours' }).click();
  await expect(page.getByRole('button', { name: 'Edit hours for Morgan' })).toBeVisible();
  await account.click();
  await expect(mode).toHaveValue('manager');
  await mode.selectOption('advisor');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit hours for Morgan' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Voicemail scripts', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Messages', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Selected message' })).toBeVisible();

  await account.click();
  await mode.selectOption('manager');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#insurance-title$/);
  await nav.getByRole('link', { name: 'Advisor hours' }).click();
  await expect(page.getByRole('button', { name: 'Edit hours for Morgan' })).toBeVisible();
});

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
  await page.keyboard.press('Slash');
  const search = page.locator('#workspace-search');
  await expect(search).toBeFocused();
  await search.fill('Spravato');
  const palette = page.getByRole('dialog', { name: 'Search workspace' });
  await expect(palette).toBeVisible();
  await expect(search).toHaveRole('combobox');
  await palette.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await expect(palette.getByRole('group', { name: 'Suggested for intake' })).toBeVisible();
  await expect(palette.getByRole('button', { name: 'Clear search' })).toBeHidden();
  await search.fill('Spravato');
  await expect(page.locator('[data-workspace-view="treatment-title"]')).toBeVisible();
  await expect(palette.getByRole('option').first()).toHaveText(/Spravato.*Treatment guide/);
  await expect(palette.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(palette.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(palette.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(palette).toBeHidden();
  await expect(page.locator('#workspace-main')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(search).toBeFocused();
  await search.fill('Spravato');
  await page.keyboard.press('Enter');
  await expect(palette).toBeHidden();
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

test('Insurance keeps clinic-specific rules, filters and Florida service guidance', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openWorkspace(page, 'light', 'insurance-title');
  const find = page.getByRole('searchbox', { name: 'Find an insurer' });
  await expect(page.getByText('Select a clinic in the call location picker')).toBeVisible();
  await clinic(page, 'CHELSEA').click();
  await find.fill('Fidelis');
  await expect(page.locator('#insurance-search-status')).toContainText('match');
  await expect(page.getByRole('cell').first().getByText('Fidelis Medicaid / UHC Medicaid', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell').first().locator('li:visible').filter({ hasNotText: /Fidelis/i })).toHaveCount(0);
  await find.clear();
  await clinic(page, 'FL').click();
  await expect(page.getByRole('button', { name: 'TMS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'SPR', exact: true }).click();
  await expect(page.getByRole('button', { name: 'SPR', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Tricare — go TMS route')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024);
});

test('clinic contact copy buttons work independently from the phone link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openWorkspace(page, 'dark');
  const phoneCopy = page.getByRole('button', { name: 'Copy clinic phone number' });
  const addressCopy = page.getByRole('button', { name: 'Copy clinic address' });
  await expect(phoneCopy).toBeHidden();
  await expect(addressCopy).toBeHidden();
  await clinic(page, 'CHELSEA').click();
  await expect(page.locator('#context-phone')).toHaveAttribute('href', 'tel:2125550103');
  await phoneCopy.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('212-555-0103');
  await addressCopy.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('100 Example Avenue, Chelsea');
});

test('Voicemail scripts remain selectable, read aloud, and free of copy controls', async ({ page }) => {
  await openWorkspace(page, 'dark', 'voicemail-title');
  const scripts = page.locator('[data-select-voicemail]');
  const selected = page.getByRole('article', { name: 'Selected voicemail' });
  await expect(scripts.nth(1)).toBeVisible();
  await scripts.nth(1).click();
  await expect(scripts.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(selected.getByText('Read aloud', { exact: true })).toBeVisible();
  await expect(selected.locator('.voicemail-body')).not.toBeEmpty();
  await expect(selected.getByRole('button', { name: /copy/i })).toHaveCount(0);
});

test('Resources filter and keep their copy actions', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openWorkspace(page, 'dark', 'resources-title');
  const cards = page.locator('#resources-list article');
  await expect(cards.first()).toBeVisible();
  await page.locator('#resource-category').selectOption('Education');
  await expect(cards.first().locator('.resource-tags')).toContainText('Education');
  await cards.first().getByRole('button', { name: 'Copy link' }).click();
  await expect(page.locator('#toast')).toHaveText('Link copied to clipboard.');
  await page.locator('#resource-search').fill('zz-no-matches');
  await expect(page.getByText('No matching resources', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(cards.first()).toBeVisible();
});

test('Hours, contacts and advisor schedules keep clinic context and permissions', async ({ page }) => {
  await openWorkspace(page, 'light', 'hours-title');
  await clinic(page, 'CHELSEA').click();
  await expect(page.locator('#hours-list')).toContainText('Chelsea');
  await expect(page.locator('#hours-list [aria-current="date"]')).toContainText('Monday');
  await page.locator('#company-emails summary').click();
  await expect(page.getByRole('link', { name: 'intake@example.test' })).toBeVisible();
  await page.getByRole('link', { name: 'Advisor hours' }).click();
  await expect(page.getByRole('rowheader', { name: 'Alex You' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Edit hours for/ })).toHaveCount(0);
});

test('Travel routes, financing and Vitamins retain their existing controls', async ({ page }) => {
  await openWorkspace(page, 'dark', 'travel-title');
  await page.locator('#travel-origin').fill('10001');
  await page.locator('#travel-mode').selectOption('transit');
  await page.getByRole('button', { name: 'Find directions' }).click();
  await expect(page.getByRole('link', { name: /^Open directions to Chelsea/ })).toHaveAttribute('href', /origin=10001.*travelmode=transit/);
  await page.getByRole('link', { name: 'Financing' }).click();
  await expect(page.getByRole('button', { name: 'Copy CareCredit link' })).toBeVisible();
  await page.getByRole('link', { name: 'Vitamins & IV' }).click();
  await page.locator('#menu-sort').selectOption('price-low');
  const prices = (await page.locator('.treatment-price').allTextContents()).map(text => Number(text.slice(1)));
  expect(prices.length).toBeGreaterThan(1);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  await page.getByRole('button', { name: 'Expand descriptions' }).click();
  await expect(page.locator('.vitamin-card details').first()).toHaveAttribute('open', '');
});

test('Template management keeps both editor dialogs and the community tab', async ({ page }) => {
  await openWorkspace(page, 'light', 'templates-title');
  const newTemplate = page.getByRole('button', { name: 'New template' });
  await newTemplate.click();
  let editor = page.getByRole('dialog', { name: 'New template' });
  await expect(editor.getByLabel('Template text')).toBeVisible();
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Voicemail scripts', exact: true }).click();
  await newTemplate.click();
  editor = page.getByRole('dialog', { name: 'New template' });
  await expect(editor.getByLabel('Template text')).toBeVisible();
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Community' }).click();
  await expect(page.getByRole('heading', { name: 'Template library' })).toBeVisible();
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
