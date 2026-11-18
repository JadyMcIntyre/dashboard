import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('Intake Hub is isolated and updates follow-ups and manager drill-down', async ({ page }) => {
  const files = new URL('../../dev/intake-hub/', import.meta.url);
  await page.route('**/intake-hub/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) || 'index.html';
    const body = await readFile(new URL(name, files), 'utf8');
    const contentType = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html';
    await route.fulfill({ body: body.replaceAll('../../dist/assets/', '../assets/'), contentType });
  });
  const outgoing = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) outgoing.push(request.url());
  });
  await page.goto('/intake-hub/');
  await expect(page.getByRole('heading', { name: 'My Day' })).toBeVisible();
  await page.getByRole('button', { name: 'New Intake' }).click();
  const intake = page.getByRole('dialog', { name: 'New intake' });
  await intake.getByLabel('Patient name').fill('Demo Patient');
  await intake.getByRole('button', { name: 'Save intake', exact: true }).click();
  await page.getByRole('button', { name: 'Demo Patient', exact: true }).click();
  await page.getByRole('button', { name: 'Save update' }).click();
  await expect(page.getByText(/Follow-up scheduled for/)).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'My Day', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Follow-ups due', exact: true })).toBeVisible();
  await page.getByLabel('Demo experience').selectOption('Manager');
  await page.getByLabel('Search patients').clear();
  await page.getByRole('button', { name: /Evaluation booked/ }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Operational Opportunities' }).click();
  await page.getByRole('button', { name: 'Explore records' }).first().click();
  await expect(page.getByRole('heading', { name: 'Insurance bottleneck' })).toBeVisible();
  expect(outgoing).toEqual([]);
});

test('journey totals require recorded milestones and follow-ups respect pauses', async () => {
  const { day, makeRecords, milestones, reached, queues, opportunities } = await import('../../dev/intake-hub/model.js');
  const cohort = makeRecords();
  expect(cohort).toHaveLength(72);
  expect(cohort.filter(record => reached(record, milestones[0]))).toHaveLength(64);
  expect(cohort.filter(record => reached(record, milestones[3]))).toHaveLength(16);
  const record = { followUp: day(), paused: true, requested: true };
  expect(queues([record])['Follow-ups due']).toHaveLength(0);
  record.paused = false;
  expect(queues([record])['Follow-ups due']).toHaveLength(1);
  expect(opportunities(cohort)[0][2].every(record => record.barrier === 'Insurance pending' && !record.paused && !record.closed)).toBe(true);
});
