import { detectFreeSlots } from '../lib/free-slots-engine';
import { CalendarEvent, FreeSlotOptions } from '../types';

// ローカル時刻で「未来の月曜日」を使用（date-fns はローカル時刻で動作するため）
const MONDAY = new Date(2099, 0, 6); // 2099-01-06 月曜
const MONDAY_END = new Date(2099, 0, 6, 23, 59, 59);

const BASE_OPTIONS: FreeSlotOptions = {
  startDate: MONDAY,
  endDate: MONDAY_END,
  workingHoursStart: 9,
  workingHoursEnd: 18,
  minimumSlotMinutes: 30,
  excludeWeekends: false,
};

function makeEvent(
  startH: number, startM: number,
  endH: number, endM: number,
  isAllDay = false,
): CalendarEvent {
  return {
    id: Math.random().toString(),
    title: 'test',
    startTime: new Date(2099, 0, 6, startH, startM, 0),
    endTime:   new Date(2099, 0, 6, endH,   endM,   0),
    isAllDay,
    colorHex: '#000',
    calendarId: 'cal1',
  };
}

describe('detectFreeSlots', () => {
  test('予定がない場合は営業時間全体が空き時間になること', () => {
    const slots = detectFreeSlots([], BASE_OPTIONS);
    expect(slots.length).toBe(1);
    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].endTime.getHours()).toBe(18);
    expect(slots[0].durationMinutes).toBe(540);
  });

  test('予定が営業時間を分割すること', () => {
    const events = [makeEvent(11, 0, 12, 0)];
    const slots = detectFreeSlots(events, BASE_OPTIONS);
    expect(slots.length).toBe(2);
    // 9:00-11:00
    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].endTime.getHours()).toBe(11);
    // 12:00-18:00
    expect(slots[1].startTime.getHours()).toBe(12);
    expect(slots[1].endTime.getHours()).toBe(18);
  });

  test('minimumSlotMinutes より短い空き時間は除外されること', () => {
    // 10:45-11:15 の予定 → 9:00-10:45 (105min) と 11:15-18:00 (405min)
    // minimumSlotMinutes=120 にすると 9:00-10:45 (105min) は除外される
    const events = [makeEvent(10, 45, 11, 15)];
    const slots = detectFreeSlots(events, { ...BASE_OPTIONS, minimumSlotMinutes: 120 });
    expect(slots.length).toBe(1);
    expect(slots[0].startTime.getHours()).toBe(11);
    expect(slots[0].startTime.getMinutes()).toBe(15);
  });

  test('終日予定がある日は空き時間なし（営業時間全体がブロック）', () => {
    const allDay: CalendarEvent = {
      id: 'allday',
      title: 'birthday',
      startTime: new Date(2099, 0, 6, 0, 0, 0),
      endTime:   new Date(2099, 0, 6, 23, 59, 59),
      isAllDay: true,
      colorHex: '#000',
      calendarId: 'cal1',
    };
    const slots = detectFreeSlots([allDay], BASE_OPTIONS);
    expect(slots.length).toBe(0);
  });

  test('excludeWeekends=true で土日をスキップすること', () => {
    // 2099-01-01 = 木曜 → 2099-01-04 = 日曜(0), 2099-01-05 = 月曜(1)
    const SUNDAY_2099 = new Date(2099, 0, 4); // 実際の日曜
    const MONDAY_2099 = new Date(2099, 0, 5); // 実際の月曜
    const options: FreeSlotOptions = {
      ...BASE_OPTIONS,
      startDate: SUNDAY_2099,
      endDate: new Date(2099, 0, 5, 23, 59, 59),
      excludeWeekends: true,
    };
    const slots = detectFreeSlots([], options);
    // 日曜はスキップ、月曜のみ
    expect(slots.length).toBe(1);
    expect(slots[0].date.getDay()).toBe(1); // 月曜
  });

  test('重複する予定がマージされること', () => {
    // 10:00-11:00 と 10:30-12:00 → 10:00-12:00 でマージ
    const events = [
      makeEvent(10, 0, 11, 0),
      makeEvent(10, 30, 12, 0),
    ];
    const slots = detectFreeSlots(events, BASE_OPTIONS);
    expect(slots.length).toBe(2);
    // 9:00-10:00
    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].endTime.getHours()).toBe(10);
    // 12:00-18:00
    expect(slots[1].startTime.getHours()).toBe(12);
    expect(slots[1].endTime.getHours()).toBe(18);
  });
});
