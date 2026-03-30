import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// If you run studio on docker, you can change the port to 8080.
const port = process.env.REUSE_SERVER === 'true' ? 8080 : 5173;
const baseUrl = `http://localhost:${port}`;
const file = `${process.env.BOOK_TEST_NAME || "raven"}.pdf`;
const previewTimeout = 1000 * 60 * 5 // 5 minutes


test('Generate book from PDF', async ({ page }) => {
  const env = process.env.OPEN_AI_API_KEY;

  if (!env) {
    throw new Error('OPEN_AI_API_KEY is not set');
  }

  const booksDir = path.join(__dirname, '../books');
  const baseName = file.replace('.pdf', '');
  if (fs.existsSync(booksDir)) {
    const matchingDirs = fs.readdirSync(booksDir).filter(d => d.startsWith(baseName));
    for (const dir of matchingDirs) {
      fs.rmSync(path.join(booksDir, dir), { recursive: true, force: true });
    }
  }

  await page.goto(baseUrl);

  await expect(page).toHaveTitle(/ADT Studio/);

  const input = page.locator('#openai-key-input');
  await input.click();
  await input.fill(env || '');

  const button = page.getByRole('button', { name: 'Save' });
  await button.click();

  await page.waitForTimeout(500);
  await page.goto(`${baseUrl}/books/new`);

  const addBookButton = page.getByTestId('drop-zone');
  const fileChooserPromise = page.waitForEvent('filechooser');

  await addBookButton.click();
  const fileChooser = await fileChooserPromise;

  const pdfPath = path.join(__dirname, '../tests/fixtures/', file);
  await fileChooser.setFiles(pdfPath);

  const bookInputLabel = page.locator('#book-label');
  const timestamp = Date.now().toString();
  await bookInputLabel.fill(`${baseName}-${timestamp}`);

  const bookInputLabelValue = await bookInputLabel.inputValue();
  expect(bookInputLabelValue).toBe(`${baseName}-${timestamp}`);

  const nextButton1 = page.getByRole('button', { name: 'Next' });
  await nextButton1.click();

  const nextButton2 = page.getByRole('button', { name: 'Next' });
  await nextButton2.click();

  const createStoryboardButton = page.getByRole('button', { name: 'Create Storyboard' });
  await createStoryboardButton.click();

  await page.waitForURL(`${baseUrl}/books/${bookInputLabelValue}/book`);

  const runStageButton = page.getByTestId('run-stage-button-extract');
  await runStageButton.click();

  await page.waitForTimeout(5000);

  const extractingLabel = page.getByText('Extracting...');

  await expect(extractingLabel).toBeVisible();

  await page.waitForTimeout(5000);

  const buildingStoryboardLabel = page.getByText('Building Storyboard...');

  await expect(buildingStoryboardLabel).toBeVisible();

  await page.goto(`${baseUrl}/books/${bookInputLabelValue}/preview`);

  const notBuiltMessage = page.getByText('A storyboard must be built before previewing');
  await expect(notBuiltMessage).toBeVisible();

  const iframe = page.locator('iframe');
  await expect(iframe).toBeVisible({ timeout: previewTimeout });
  await expect(notBuiltMessage).not.toBeVisible();
});
