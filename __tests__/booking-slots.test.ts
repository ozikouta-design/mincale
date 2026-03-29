import { computeAvailabilityGrid, computeAvailableSlots } from '../lib/booking-slots';

// ローカル時刻で「未来の月曜日」を作成（date-fns はローカル時刻で動作するため）
const FUTURE_DATE = new Date(2099, 0, 6); // 2099-01-06 (月曜)

// ローカル時刻で BusyPeriod を作るヘルパー
function busy(startH: number, startM: number, endH: number, endM: number) {
  return {
    start_time: new Date(2099, 0, 6, startH, startM, 0).toISOString(),
    end_time:   new Date(2099, 0, 6, endH,   endM,   0).toISOString(),
  };
}

describe('computeAvailabilityGrid', () => {
  test('営業時間外のスロットが生成されないこと', () => {
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 18, [], 1);
    const cells = grid[0].cells;
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach(cell => {
      const h = cell.startTime.getHours();
      expect(h).toBeGreaterThanOrEqual(9);
      expect(h).toBeLessThan(18);
    });
  });

  test('終了時刻が endHour を超えるスロットは含まれないこと', () => {
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 18, [], 1);
    const cells = grid[0].cells;
    cells.forEach(cell => {
      const endH = cell.endTime.getHours();
      const endM = cell.endTime.getMinutes();
      expect(endH * 60 + endM).toBeLessThanOrEqual(18 * 60);
    });
  });

  test('30分刻みでスロットが生成されること', () => {
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 11, [], 1);
    const cells = grid[0].cells;
    // 9:00-9:30, 9:30-10:00, 10:00-10:30, 10:30-11:00 → 4スロット
    expect(cells.length).toBe(4);
  });

  test('既存の予定と重複するスロットが available:false になること', () => {
    const busyPeriods = [busy(9, 0, 10, 0)];
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 11, busyPeriods, 1);
    const cells = grid[0].cells;
    // 9:00-9:30 と 9:30-10:00 がブロックされる
    expect(cells[0].available).toBe(false);
    expect(cells[1].available).toBe(false);
    // 10:00-10:30 と 10:30-11:00 は空き
    expect(cells[2].available).toBe(true);
    expect(cells[3].available).toBe(true);
  });

  test('allowedDays 未指定の場合は全曜日が利用可能', () => {
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 10, [], 7);
    grid.forEach(day => {
      day.cells.forEach(cell => {
        expect(cell.available).toBe(true);
      });
    });
  });

  test('allowedDays に含まれない曜日のスロットが available:false になること', () => {
    // FUTURE_DATE = 2099-01-06 (月曜=1)。平日のみ許可
    const allowedDays = [1, 2, 3, 4, 5];
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 10, [], 7, allowedDays);
    grid.forEach(day => {
      const dow = day.date.getDay(); // ローカル時刻の曜日
      const isWeekend = dow === 0 || dow === 6;
      day.cells.forEach(cell => {
        if (isWeekend) {
          expect(cell.available).toBe(false);
        } else {
          expect(cell.available).toBe(true);
        }
      });
    });
  });

  test('指定した days 分の日付が生成されること', () => {
    const grid = computeAvailabilityGrid(FUTURE_DATE, 30, 9, 10, [], 5);
    expect(grid.length).toBe(5);
  });
});

describe('computeAvailableSlots', () => {
  test('営業時間内のスロットのみ返すこと', () => {
    const slots = computeAvailableSlots(FUTURE_DATE, 30, 9, 18, []);
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach(slot => {
      const h = slot.startTime.getHours();
      expect(h).toBeGreaterThanOrEqual(9);
      expect(h).toBeLessThan(18);
    });
  });

  test('既存予約と重複するスロットが除外されること', () => {
    const existingBookings = [busy(9, 0, 10, 0)];
    const slots = computeAvailableSlots(FUTURE_DATE, 30, 9, 11, existingBookings);
    // 9:00-9:30 と 9:30-10:00 がブロックされ、10:00-10:30 と 10:30-11:00 が残る
    expect(slots.length).toBe(2);
    expect(slots[0].startTime.getHours()).toBe(10);
    expect(slots[0].startTime.getMinutes()).toBe(0);
  });

  test('予約なしの場合、営業時間内すべてのスロットが返ること', () => {
    // 9:00-11:00、30分刻みで 4スロット
    const slots = computeAvailableSlots(FUTURE_DATE, 30, 9, 11, []);
    expect(slots.length).toBe(4);
  });
});
