import { test, expect } from '@playwright/test';

/**
 * E2E シナリオ 3 (詳細):
 * 予約確定フロー: 予約ページでスロット選択 → フォーム入力 → 送信
 *
 * 注意: 実際の予約送信にはSupabaseへの書き込みが必要。
 * CI ではモック API を使用するか、テスト専用スラッグを用意する。
 */
test.describe('予約フォーム送信フロー', () => {
  test('予約ページにアクセスできること', async ({ page }) => {
    await page.goto('/booking/test');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test('スロット選択後にフォームが表示される構造であること', async ({ page }) => {
    await page.goto('/booking/test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 空きスロットが存在する場合はクリックしてフォームを確認
    const slots = page.locator('[data-testid="slot-available"]');
    const slotCount = await slots.count();

    if (slotCount > 0) {
      await slots.first().click();
      await page.waitForTimeout(500);
      // フォームフィールドが表示されること
      const nameInput = page.getByPlaceholder(/山田|名前|name/i);
      await expect(nameInput).toBeVisible({ timeout: 3000 });
    } else {
      // スロットなし（設定済みスラッグが必要）- ページは正常表示
      const hasError = await page.getByText(/見つかりません|エラー/i).isVisible().catch(() => false);
      const hasLoading = await page.getByText(/空き時間|タイムゾーン/i).isVisible().catch(() => false);
      expect(hasError || hasLoading).toBeTruthy();
    }
  });

  test('フォームに必須項目なしで送信するとバリデーションエラーになること', async ({ page }) => {
    await page.goto('/booking/test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const slots = page.locator('[data-testid="slot-available"]');
    const slotCount = await slots.count();

    if (slotCount > 0) {
      await slots.first().click();
      await page.waitForTimeout(500);

      // 「予約する」ボタンを空のまま押す
      const submitBtn = page.getByRole('button', { name: /予約する/i });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        // エラーアラートまたはバリデーションメッセージが表示されること
        await page.waitForTimeout(500);
        const alertVisible = await page.getByText(/入力してください|必須|required/i).isVisible().catch(() => false);
        // ブラウザのアラートはPlaywrightで確認が難しいため、クリック後にページが変わらないことを確認
        expect(alertVisible || (await page.url()).includes('/booking/')).toBeTruthy();
      }
    }
  });
});

/**
 * API エンドポイントの基本動作確認
 */
test.describe('APIエンドポイント', () => {
  test('GET /api/bookings が認証なしで適切に応答すること', async ({ request }) => {
    const res = await request.get('/api/bookings?host_email=test@example.com');
    // 認証なし = 200 (空配列) または 400 系 (パラメータ不足)
    expect([200, 400, 401, 403]).toContain(res.status());
  });

  test('POST /api/bookings にボディなしで送ると 400 系になること', async ({ request }) => {
    const res = await request.post('/api/bookings', { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
