import { fileURLToPath } from 'node:url';

export async function openSignIn(page, theme, hash = 'treatment-title') {
  const stub = fileURLToPath(new URL('./supabase-fixture.js', import.meta.url));
  await page.route('**/cdn.jsdelivr.net/**/supabase.js', route =>
    route.fulfill({ path: stub, contentType: 'application/javascript' })
  );
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.addInitScript(preference => {
    if (!localStorage.getItem('renue-theme')) localStorage.setItem('renue-theme', preference);
  }, theme);
  await page.clock.setFixedTime(new Date('2026-11-16T18:30:00Z'));
  await page.goto('/index.html#' + hash);
}

export async function openWorkspace(page, theme, hash = 'treatment-title') {
  await openSignIn(page, theme, hash);
  await page.locator('#staff-sign-in input[name=email]').fill('alex@example.test');
  await page.locator('#sign-in-password').fill('fixture-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('#workspace-view-title').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
}
