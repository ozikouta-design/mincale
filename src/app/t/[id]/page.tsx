"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

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

  const availableSlots = ["10:00", "11:00", "13:00", "15:00", "16:30"];

  // ★ 修正：APIを呼び出すように書き換え
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !guestName) return;

    setIsSubmitting(true);
    
    // 選択された時間から、開始日時と終了日時（30分後）を計算
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startDt = new Date(selectedDate);
    startDt.setHours(hours, minutes, 0, 0);
    const endDt = new Date(startDt.getTime() + 30 * 60000);

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostSlug: hostId,
          guestName, guestEmail, guestPhone, guestNotes,
          meetingType, zoomUrl, location, otherDetails,
          startDt: startDt.toISOString(),
          endDt: endDt.toISOString()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '予約に失敗しました');
      }
      
      setIsSuccess(true);
    } catch (err: any) {
      alert(`エラーが発生しました: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">予約が完了しました！</h1>
          <p className="text-gray-600 mb-6">
            ホストのカレンダーに予定が追加されました。<br/>
            {guestEmail && "ご入力いただいたメールアドレスにも詳細を送信しております。"}
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-100 mb-6">
            <div className="text-sm text-gray-500 mb-1">日時</div>
            <div className="font-medium text-gray-800 mb-3">
              {selectedDate?.toLocaleDateString("ja-JP")} {selectedTime}〜
            </div>
            <div className="text-sm text-gray-500 mb-1">実施形式</div>
            <div className="font-medium text-gray-800 mb-3">
              {meetingType === "meet" && "Google Meet (自動発行)"}
              {meetingType === "zoom" && `Zoom ${zoomUrl ? `(${zoomUrl})` : "(URL後送)"}`}
              {meetingType === "inperson" && `対面 ${location ? `(${location})` : "(場所後送)"}`}
              {meetingType === "other" && `その他 ${otherDetails ? `(${otherDetails})` : ""}`}
            </div>
            <div className="text-sm text-gray-500 mb-1">ホスト</div>
            <div className="font-medium text-gray-800">{decodeURIComponent(hostId)} 様</div>
          </div>
          <button onClick={() => window.close()} className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">
            画面を閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        
        {/* 左側：ホスト情報と説明 */}
        <div className="bg-gray-50 w-full md:w-1/3 p-8 border-r border-gray-200 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-sm">
              {decodeURIComponent(hostId).charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{decodeURIComponent(hostId)}</h2>
            <h1 className="text-2xl font-black text-gray-900 mt-6 mb-4">お打ち合わせ（30分）</h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              ご希望の日時と実施形式を選択してください。<br />
              確定後、自動的にホストのカレンダーに予定が追加されます。
            </p>
            <div className="flex items-center text-gray-500 text-sm font-medium">
              <Clock className="w-4 h-4 mr-2" /> 30分
            </div>
          </div>
        </div>

        {/* 右側：日時選択 または フォーム入力 */}
        <div className="w-full md:w-2/3 p-8">
          {!selectedTime ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-gray-800 mb-6">日時を選択してください</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* カレンダー */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                    <span className="font-bold text-gray-800">2026年 3月</span>
                    <button className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                    <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {[...Array(31)].map((_, i) => {
                      const d = i + 1;
                      const isAvailable = d % 2 === 0;
                      const isSelected = selectedDate?.getDate() === d;
                      return (
                        <button 
                          key={i} 
                          onClick={() => { if (isAvailable) setSelectedDate(new Date(2026, 2, d)); }}
                          disabled={!isAvailable}
                          className={`py-2 rounded-full transition-all ${!isAvailable ? 'text-gray-300 cursor-not-allowed' : isSelected ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium'}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 時間スロット */}
                <div>
                  {selectedDate ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-sm font-bold text-gray-700 mb-3">{selectedDate.toLocaleDateString("ja-JP")}の空き時間</div>
                      {availableSlots.map(time => (
                        <button key={time} onClick={() => setSelectedTime(time)} className="w-full py-3 border border-blue-200 text-blue-600 font-bold rounded-xl hover:border-blue-600 transition-colors bg-white">
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      左のカレンダーから日付を選択してください
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-md mx-auto">
              <button onClick={() => setSelectedTime(null)} className="flex items-center text-sm text-blue-600 font-medium hover:underline mb-6">
                <ChevronLeft className="w-4 h-4 mr-1" /> 日時選択に戻る
              </button>
              
              <h3 className="text-lg font-bold text-gray-800 mb-6">詳細情報の入力</h3>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 flex items-center">
                <CalendarIcon className="w-5 h-5 text-gray-500 mr-3" />
                <div className="text-gray-800 font-medium">{selectedDate?.toLocaleDateString("ja-JP")} {selectedTime}〜</div>
              </div>

              <form onSubmit={handleBook} className="space-y-5">
                
                {/* 実施形式の選択 */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">実施形式 *</label>
                    <div className="relative">
                      <select 
                        value={meetingType} 
                        onChange={(e) => setMeetingType(e.target.value as any)} 
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all appearance-none bg-white text-gray-800 font-medium"
                      >
                        <option value="meet">Google Meet</option>
                        <option value="zoom">Zoom</option>
                        <option value="inperson">対面</option>
                        <option value="other">その他</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    {meetingType === "meet" && (
                      <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs font-medium border border-blue-100">
                        💡 予定確定後、自動的にGoogle MeetのURLが発行されます。
                      </div>
                    )}
                    {meetingType === "zoom" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Zoom URL (任意)</label>
                        <input type="url" value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none text-sm" placeholder="https://zoom.us/j/..." />
                      </div>
                    )}
                    {meetingType === "inperson" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">場所・住所 (任意)</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none text-sm" placeholder="東京都〇〇区..." />
                      </div>
                    )}
                    {meetingType === "other" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">詳細 (任意)</label>
                        <input type="text" value={otherDetails} onChange={e => setOtherDetails(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none text-sm" placeholder="お電話にて（090-...）など" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">お名前 *</label>
                    <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="山田 太郎" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">メール (任意)</label>
                      <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="yamada@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">電話番号 (任意)</label>
                      <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="090-0000-0000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">事前にお伝えしたいこと (任意)</label>
                    <textarea rows={3} value={guestNotes} onChange={e => setGuestNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="当日のアジェンダなど" />
                  </div>
                </div>
                
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