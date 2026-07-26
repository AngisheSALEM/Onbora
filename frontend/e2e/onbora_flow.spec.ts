import { test, expect } from '@playwright/test';

test.describe('Onbora End-to-End Key Scenarios', () => {
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const FRONTEND_URL = 'http://localhost:3000';

  test('Scenario 1: B2B Client Discovery & Business Twin Generation', async ({ page }) => {
    // 1. Visit login page
    await page.goto(`${FRONTEND_URL}/login`);
    
    // 2. Perform Login as Client B2B
    await page.fill('input[type="email"]', 'client@onbora.com');
    await page.fill('input[type="password"]', 'clientpass123');
    await page.click('button[type="submit"]');
    
    // 3. Verify redirected to B2B space
    await expect(page).toHaveURL(`${FRONTEND_URL}/client`);
    await expect(page.locator('h1')).toContainText('Onbora Discovery');

    // 4. Send qualifying message to Chatbot
    const chatInput = page.locator('input[placeholder*="message"]');
    await chatInput.fill('Bonjour, nous sommes une clinique médicale de 45 personnes répartie sur 3 sites à Kinshasa.');
    await page.keyboard.press('Enter');

    // 5. Verify conversation messages list updates
    await expect(page.locator('div.glass-card')).toContainText('clinique');

    // 6. Verify that once qualified, the Business Twin mini-preview appears
    const twinPreview = page.locator('text=Jumeau Numérique');
    await expect(twinPreview).toBeVisible({ timeout: 15000 });
  });

  test('Scenario 2: Salesperson visit preparation & Voice transcript upload', async ({ page }) => {
    // 1. Visit login
    await page.goto(`${FRONTEND_URL}/login`);
    
    // 2. Perform Login as Salesperson
    await page.fill('input[type="email"]', 'sales@onbora.com');
    await page.fill('input[type="password"]', 'salespass123');
    await page.click('button[type="submit"]');

    // 3. Verify sales workspace redirect
    await expect(page).toHaveURL(`${FRONTEND_URL}/sales`);

    // 4. Search and select enterprise
    await page.fill('input[placeholder*="Rechercher"]', 'Clinique Lumiere');
    await page.click('text=Clinique Lumiere');

    // 5. Start visit preparation
    await page.click('text=Préparer la visite');
    await page.click('text=Lancer la dictée vocale');

    // 6. Verify file upload size limit error for extremely large files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Importer un fichier audio');
    const fileChooser = await fileChooserPromise;
    
    // Upload a simulated massive audio file to test limit
    await fileChooser.setFiles({
      name: 'large_memo.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(12 * 1024 * 1024) // 12 MB (exceeds 10 MB limit)
    });

    await expect(page.locator('text=trop volumineux')).toBeVisible();
  });

  test('Scenario 3: KAM Lifecycle transitions & PDF contract generation', async ({ page }) => {
    // 1. Visit login
    await page.goto(`${FRONTEND_URL}/login`);
    
    // 2. Login as KAM
    await page.fill('input[type="email"]', 'kam@onbora.com');
    await page.fill('input[type="password"]', 'kampass123');
    await page.click('button[type="submit"]');

    // 3. Verify KAM workspace redirect
    await expect(page).toHaveURL(`${FRONTEND_URL}/kam`);

    // 4. Select dossier
    await page.click('.dossier-card >> first');

    // 5. Advance dossier status (lifecycle events tracking)
    await page.selectOption('select[name="status"]', 'DOSSIER_IN_REVIEW');
    
    // 6. Verify success logs event created
    await expect(page.locator('.events-timeline')).toContainText('Revue technique');

    // 7. Verify ReportLab PDF exports are downloadable
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Fiche Client (PDF)');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
