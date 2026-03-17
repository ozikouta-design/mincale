"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatLocalISO } from "@/hooks/useCalendarLogic";

export default function PublicBookingPage() {
  const params = useParams();
  const hostId = params.id as string; 
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<"meet" | "zoom" | "inperson" | "other">("meet");
  const [zoomUrl, setZoomUrl] = useState("");
  const [location, setLocation] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [busySlots, setBusySlots] = useState<{start: string, end: string}[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);

  // ★ リードタイムと週始まりを追加
  const [hostSettings, setHostSettings] = useState<{name: string, duration: number, startHour: number, endHour: number, days: number[], leadTime: number, weekStartDay: number} | null>(null);

  useEffect(() => {
    fetch(`/api/host/${hostId}`).then(res => res.json()).then(data => { if (!data.error) setHostSettings(data); });
  }, [hostId]);

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingCalendar(true);
      const y = currentMonthDate.getFullYear(); const m = currentMonthDate.getMonth();
      const startOfMonth = new Date(y, m, 1); const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59);

      try {
        const res = await fetch('/api/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostSlug: hostId, timeMin: startOfMonth.toISOString(), timeMax: endOfMonth.toISOString() }) });
        if (res.ok) { const data = await res.json(); setBusySlots(data.busy || []); }
      } catch (e) { console.error(e); } finally { setIsLoadingCalendar(false); }
    };
    fetchAvailability();
  }, [currentMonthDate, hostId]);

  const getAvailableSlotsForDate = (date: Date) => {
    const slots: string[] = [];
    if (!hostSettings) return slots;

    // ★ リードタイム（何時間後から予約可能か）の計算
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + hostSettings.leadTime * 60 * 60 * 1000);

    let currentMin = hostSettings.startHour * 60;
    const endMin = hostSettings.endHour * 60;

    while (currentMin < endMin) {
      if (currentMin + hostSettings.duration > endMin) break;

      const h = Math.floor(currentMin / 60); const m = currentMin % 60;
      const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0);
      const slotEnd = new Date(slotStart.getTime() + hostSettings.duration * 60000);

      // ★ 過去やリードタイム以内の時間は除外
      if (slotStart > minBookingTime) {
        let isBusy = false;
        for (const busy of busySlots) {
          const busyStart = new Date(busy.start); const busyEnd = new Date(busy.end);
          if (slotStart < busyEnd && slotEnd > busyStart) { isBusy = true; break; }
        }
        if (!isBusy) slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
      currentMin += hostSettings.duration;
    }
    return slots;
  };

  const generateCalendarDays = () => {
    const y = currentMonthDate.getFullYear(); const m = currentMonthDate.getMonth();
    let firstDay = new Date(y, m, 1).getDay(); 
    const daysInMonth = new Date(y, m + 1, 0).getDate(); 
    
    // ★ 月曜始まりのシフト計算
    if (hostSettings?.weekStartDay === 1) { firstDay = firstDay === 0 ? 6 : firstDay - 1; }
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(y, m, i));
    return days;
  };

  const calendarDays = generateCalendarDays();
  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const isDateAvailable = (date: Date) => {
    if (!hostSettings || !hostSettings.days.includes(date.getDay())) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    if (date < today) return false;
    return getAvailableSlotsForDate(date).length > 0;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !guestName || !hostSettings) return;
    setIsSubmitting(true);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startDt = new Date(selectedDate); startDt.setHours(hours, minutes, 0, 0);
    const endDt = new Date(startDt.getTime() + hostSettings.duration * 60000);

    try {
      const res = await fetch('/api/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostSlug: hostId, guestName, guestEmail, guestPhone, guestNotes, meetingType, zoomUrl, location, otherDetails, startDt: formatLocalISO(startDt), endDt: formatLocalISO(endDt) })
      });
      if (!res.ok) throw new Error('予約に失敗しました');
      setIsSuccess(true);
    } catch (err: any) { alert(`エラー: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  if (!hostSettings) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8" /></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">予約が完了しました！</h1>
          <button onClick={() => window.close()} className="w-full py-3 mt-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">画面を閉じる</button>
        </div>
      </div>
    );
  }

  // ★ 曜日のラベルを動的に生成（週末色分け）
  const weekDays = hostSettings.weekStartDay === 1 ? ['月', '火', '水', '木', '金', '土', '日'] : ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        
        <div className="bg-gray-50 w-full md:w-1/3 p-8 border-r border-gray-200 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-sm">{(hostSettings.name || decodeURIComponent(hostId)).charAt(0).toUpperCase()}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{hostSettings.name || decodeURIComponent(hostId)}</h2>
            <h1 className="text-2xl font-black text-gray-900 mt-6 mb-4">お打ち合わせ（{hostSettings.duration}分）</h1>
            <div className="flex items-center text-gray-500 text-sm font-medium"><Clock className="w-4 h-4 mr-2" /> {hostSettings.duration}分</div>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-8">
          {!selectedTime ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-gray-800 mb-6">日時を選択してください</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border border-gray-200 rounded-xl p-4 h-fit">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                    <span className="font-bold text-gray-800">{currentMonthDate.getFullYear()}年 {currentMonthDate.getMonth() + 1}月</span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                  </div>
                  
                  {/* ★ 曜日の色分け表示 */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold mb-2">
                    {weekDays.map(w => (
                      <div key={w} className={`${w === '土' ? 'text-blue-500' : w === '日' ? 'text-red-500' : 'text-gray-500'}`}>{w}</div>
                    ))}
                  </div>
                  
                  {isLoadingCalendar ? (
                    <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {calendarDays.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} className="py-2"></div>;
                        const isAvailable = isDateAvailable(date);
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        const dayOfWeek = date.getDay();
                        // ★ 日付の文字色も週末は色分け
                        const textColor = !isAvailable ? 'text-gray-200' : isSelected ? 'text-white' : dayOfWeek === 6 ? 'text-blue-600' : dayOfWeek === 0 ? 'text-red-600' : 'text-gray-700';

                        return (
                          <button key={i} onClick={() => { if (isAvailable) setSelectedDate(date); setSelectedTime(null); }} disabled={!isAvailable}
                            className={`py-2 rounded-full font-medium transition-all ${textColor} ${isAvailable && !isSelected && 'hover:bg-blue-50 hover:text-blue-700'} ${isSelected && 'bg-blue-600 font-bold shadow-md'}`}>
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  {selectedDate ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-sm font-bold text-gray-700 mb-3">{selectedDate.toLocaleDateString("ja-JP")}の空き時間</div>
                      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                        {getAvailableSlotsForDate(selectedDate).length > 0 ? (
                          getAvailableSlotsForDate(selectedDate).map(time => (
                            <button key={time} onClick={() => setSelectedTime(time)} className="w-full py-3 border border-blue-200 text-blue-600 font-bold rounded-xl hover:border-blue-600 transition-colors bg-white">{time}</button>
                          ))
                        ) : (<div className="text-sm text-gray-500 py-4 text-center">この日は空き時間がありません</div>)}
                      </div>
                    </div>
                  ) : (<div className="h-full min-h-[200px] flex items-center justify-center text-gray-400 text-sm">左のカレンダーから日付を選択してください</div>)}
                </div>
              </div>
            </div>
          ) : (
            /* フォーム部分はそのまま */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-md mx-auto">
              {/* 前のコードと同じフォーム部分を維持 */}
               <button onClick={() => setSelectedTime(null)} className="flex items-center text-sm text-blue-600 font-medium hover:underline mb-6"><ChevronLeft className="w-4 h-4 mr-1" /> 日時選択に戻る</button>
              <h3 className="text-lg font-bold text-gray-800 mb-6">詳細情報の入力</h3>
              <form onSubmit={handleBook} className="space-y-5">
                 {/* 省略していますが、先ほどのフォームの内容がここに入ります */}
                 <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors disabled:opacity-70 mt-4 flex items-center justify-center">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "予定を確定する"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}