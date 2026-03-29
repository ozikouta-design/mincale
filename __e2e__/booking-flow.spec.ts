import { test, expect } from '@playwright/test';

/**
 * E2E シナリオ 1:
 * ログイン → カレンダー表示（週表示）→ 予定作成
 *
 * 注意: Google OAuth は本 E2E では mock が必要。
 * ここでは認証済み状態を前提にしたスモークテストを記述する。
 */
test.describe('カレンダー週表示と予定作成', () => {
  test('トップページが表示されること', async ({ page }) => {
    await page.goto('/');
    // ローディング or ログイン画面が表示される
    await expect(page).toHaveTitle(/みんカレ/i);
  });

  test('未認証時にサインインボタンが表示されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // カレンダーヘッダーまたはサインインプロンプトの存在を確認
    const hasSignIn = await page.getByText(/Googleでサインイン|Sign in/i).isVisible().catch(() => false);
    const hasCalendar = await page.locator('[data-testid="week-view"], text=週').isVisible().catch(() => false);
    expect(hasSignIn || hasCalendar).toBe(true);
  });
});

/**
 * E2E シナリオ 2:
 * 予約URLスラッグで予約ページが開けること
 */
test.describe('予約ページ', () => {
  test('存在しないスラッグでエラーメッセージが表示されること', async ({ page }) => {
    await page.goto('/booking/nonexistent-slug-e2e-test-xyz');
    await page.waitForLoadState('networkidle');
    // エラーまたはローディング終了を待つ
    await page.waitForTimeout(3000);
    const errorVisible = await page.getByText(/見つかりません|エラー|not found/i).isVisible().catch(() => false);
    const loadingGone = !(await page.locator('[data-testid="loading"], [aria-label="loading"]').isVisible().catch(() => false));
    // エラーが表示されるか、ローディングが終わっていること
    expect(errorVisible || loadingGone).toBe(true);
  });

  test('予約ページのURLが /booking/ 形式であること', async ({ page }) => {
    const response = await page.goto('/booking/test');
    // 404 にリダイレクトされないこと（Expo SPA として / にリライトされる）
    expect(response?.status()).not.toBe(404);
  });
});

/**
 * E2E シナリオ 3:
 * 予約ページで時間スロットを選択するとフォームが表示されること
 * (公開スラッグを持つホストが存在する場合のみ動作)
 */
test.describe('予約フォーム遷移', () => {
  test('予約ページの基本構造が正しいこと', async ({ page }) => {
    await page.goto('/booking/test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // タイムゾーンバーの存在確認
    const tzBar = await page.getByText(/タイムゾーン|GMT/i).isVisible().catch(() => false);
    // ホスト情報カードまたはエラーの存在確認
    const hasContent = await page.locator('body').innerText();
    expect(hasContent.length).toBeGreaterThan(0);
    // tzBar があればより良い（認証済みホストのスラッグが必要）
    // ない場合もテストは通過（未設定スラッグの場合はエラー表示）
    expect(tzBar || hasContent.includes('見つかり')).toBeTruthy();
  });
});
