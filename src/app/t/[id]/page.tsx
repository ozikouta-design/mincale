"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, User, Mail, MessageSquare, Video, Phone, MapPin, Link as LinkIcon, ArrowLeft } from "lucide-react";

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
  const [step, setStep] = useState<1 | 2>(1); 

  const [gridStartDate, setGridStartDate] = useState(new Date());
  const [busySlots, setBusySlots] = useState<{start: string, end: string}[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [hostSettings, setHostSettings] = useState<{id: string, email: string, name: string, title: string, duration: number, startHour: number, endHour: number, days: number[], leadTime: number, weekStartDay: number} | null>(null);

  useEffect(() => {
    const fetchHost = async () => {
      try {
        let data = null;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hostId);
        if (isUUID) { const { data: idData } = await supabase.from('profiles').select('*').eq('id', hostId).single(); data = idData; }
        if (!data) { const { data: emailData } = await supabase.from('profiles').select('*').ilike('email', `${hostId}%`).limit(1).single(); data = emailData; }

        if (data) {
          setHostSettings({
            id: data.id || data.email || hostId, email: data.email || "",
            name: data.email ? data.email.split('@')[0] : "ホスト", title: data.booking_title || "ミーティングの予約",
            duration: data.booking_duration || 30, startHour: data.booking_start_hour || 10, endHour: data.booking_end_hour || 18,
            days: data.booking_days || [1,2,3,4,5], leadTime: data.booking_lead_time || 24, weekStartDay: data.week_start_day || 0,
          });
        } else { setIsLoadingCalendar(false); }
      } catch (err) { console.error("ホスト取得エラー:", err); setIsLoadingCalendar(false); }
    };
    fetchHost();
  }, [hostId]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!hostSettings) return;
      const targetId = hostSettings.id || hostSettings.email;
      if (!targetId) { setIsLoadingCalendar(false); return; }

      setIsLoadingCalendar(true);
      try {
        const startDt = new Date(gridStartDate); startDt.setHours(0,0,0,0);
        const endDt = new Date(gridStartDate); endDt.setDate(endDt.getDate() + 30); endDt.setHours(23,59,59,999);

        const { data, error } = await supabase.from('bookings').select('start_time, end_time').eq('profile_id', targetId).gte('start_time', startDt.toISOString()).lte('start_time', endDt.toISOString());
        if (error) throw error;
        if (data) setBusySlots(data.map(b => ({ start: b.start_time, end: b.end_time })));
      } catch (err) { console.error("空き時間取得エラー:", err); } 
      finally { setIsLoadingCalendar(false); }
    };
    fetchAvailability();
  }, [gridStartDate, hostSettings]);

  const displayDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(gridStartDate); d.setDate(gridStartDate.getDate() + i); days.push(d);
    }
    return days;
  }, [gridStartDate]);

  const timeSlots = useMemo(() => {
    if (!hostSettings) return [];
    const slots = [];
    let currentMin = hostSettings.startHour * 60;
    const endMin = hostSettings.endHour * 60;
    while (currentMin < endMin) {
      if (currentMin + hostSettings.duration > endMin) break;
      const h = Math.floor(currentMin / 60); const m = currentMin % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      currentMin += hostSettings.duration;
    }
    return slots;
  }, [hostSettings]);

  const monthSpans = useMemo(() => {
    if (displayDays.length === 0) return [];
    const spans = [];
    let curMonth = displayDays[0].getMonth(); let curYear = displayDays[0].getFullYear(); let spanCount = 0;
    displayDays.forEach(d => {
      if (d.getMonth() === curMonth && d.getFullYear() === curYear) { spanCount++; } 
      else { spans.push({ year: curYear, month: curMonth, span: spanCount }); curMonth = d.getMonth(); curYear = d.getFullYear(); spanCount = 1; }
    });
    spans.push({ year: curYear, month: curMonth, span: spanCount });
    return spans;
  }, [displayDays]);

  const isSlotAvailable = (date: Date, timeStr: string) => {
    if (!hostSettings || !hostSettings.days.includes(date.getDay())) return false;
    const now = new Date(); const minBookingTime = new Date(now.getTime() + hostSettings.leadTime * 60 * 60 * 1000);
    const [h, m] = timeStr.split(':').map(Number);
    const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0);
    const slotEnd = new Date(slotStart.getTime() + hostSettings.duration * 60000);
    
    if (slotStart <= minBookingTime) return false;
    
    let isBusy = false;
    for (const busy of busySlots) {
      const busyStart = new Date(busy.start); const busyEnd = new Date(busy.end);
      if (slotStart < busyEnd && slotEnd > busyStart) { isBusy = true; break; }
    }
    return !isBusy;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return alert("カレンダーから日時を選択してください。");
    if (!guestName.trim() || !guestEmail.trim()) return alert("お名前とメールアドレスを入力してください。");
    if (meetingType === 'zoom' && !zoomUrl.trim()) return alert("Zoom URLを入力してください。");
    if (meetingType === 'inperson' && !location.trim()) return alert("希望の場所・住所を入力してください。");
    if (meetingType === 'other' && !otherDetails.trim()) return alert("開催方法の詳細を入力してください。");
    const targetProfileId = hostSettings?.id || hostSettings?.email;
    if (!targetProfileId) return alert("ホストの情報が取得できませんでした。");

    setIsSubmitting(true);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startDt = new Date(selectedDate); startDt.setHours(hours, minutes, 0, 0);
    const endDt = new Date(startDt.getTime() + (hostSettings?.duration || 30) * 60000);

    // ★ 修正：APIを呼び出して、Googleカレンダー同期とメール送信を実行！
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: targetProfileId,
          hostEmail: hostSettings?.email,
          guestName,
          guestEmail,
          guestPhone,
          meetingType,
          zoomUrl: meetingType === 'zoom' ? zoomUrl : null,
          location: meetingType === 'inperson' ? location : null,
          otherDetails: meetingType === 'other' ? otherDetails : null,
          startDt: startDt.toISOString(),
          endDt: endDt.toISOString(),
          guestNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "予約の送信に失敗しました");

      setIsSuccess(true);
    } catch (err: any) { 
      alert(`エラーが発生しました: ${err.message}`); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (!hostSettings && !isLoadingCalendar) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><h1 className="text-2xl font-bold text-gray-800 mb-2">ページが見つかりません</h1><p className="text-gray-500">URLが間違っているか、ユーザーが存在しません。</p></div>;
  if (!hostSettings) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10" /></div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">予約が完了しました！</h1>
          <p className="text-gray-500 font-medium mb-8 leading-relaxed">ご入力いただいたメールアドレス宛に、<br/>詳細とカレンダーの招待をお送りしました。</p>
          <button onClick={() => window.close()} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">画面を閉じる</button>
        </div>
      </div>
    );
  }

  const accentColor = "#2563eb"; 

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-6 md:py-12 px-3 md:px-6 font-sans text-gray-800">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col min-h-[600px] animate-in fade-in zoom-in-95 duration-300">
        
        {/* === 上部ヘッダー（ホスト情報） === */}
        <div className="p-6 md:p-8 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60 pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-md shrink-0" style={{ backgroundColor: accentColor }}>
              {hostSettings.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-bold text-gray-500 mb-0.5 tracking-wide">{hostSettings.name}</p>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{hostSettings.title}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 shrink-0 w-fit relative z-10">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="font-black text-gray-700 text-sm">{hostSettings.duration} 分</span>
          </div>
        </div>

        {/* === メインコンテンツ === */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
          
          {/* STEP 1: マトリックスUI */}
          {step === 1 && (
            <div className="p-4 md:p-8 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-base font-black text-gray-800 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-blue-500" />希望の日時を選択してください</h2>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
                  <button onClick={() => { const d = new Date(gridStartDate); d.setDate(d.getDate() - 14); setGridStartDate(d); }} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center"><ChevronLeft className="w-4 h-4 mr-1"/>前の2週間</button>
                  <div className="w-px h-4 bg-gray-200"></div>
                  <button onClick={() => setGridStartDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">今日</button>
                  <div className="w-px h-4 bg-gray-200"></div>
                  <button onClick={() => { const d = new Date(gridStartDate); d.setDate(d.getDate() + 14); setGridStartDate(d); }} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center">次の2週間<ChevronRight className="w-4 h-4 ml-1"/></button>
                </div>
              </div>

              {isLoadingCalendar ? (
                <div className="flex-1 flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar border border-gray-200 rounded-2xl bg-white shadow-sm">
                  <table className="w-full min-w-max border-collapse text-center relative">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-gray-100/80 border-b border-gray-200">
                        <th className="p-2 border-r border-gray-200 w-20 shrink-0 sticky left-0 z-30 bg-gray-100/80 font-bold text-xs text-gray-500" rowSpan={2}>開始時刻</th>
                        {monthSpans.map((m, i) => (
                          <th key={i} colSpan={m.span} className={`py-1.5 px-2 text-xs font-black text-gray-700 ${i !== monthSpans.length - 1 ? 'border-r border-gray-200' : ''}`}>
                            {m.year}年 {m.month + 1}月
                          </th>
                        ))}
                        <th className="p-2 border-l border-gray-200 w-20 shrink-0 sticky right-0 z-30 bg-gray-100/80 font-bold text-xs text-gray-500" rowSpan={2}>開始時刻</th>
                      </tr>
                      <tr className="bg-gray-50 border-b border-gray-200 shadow-sm">
                        {displayDays.map((d, i) => {
                          const isSat = d.getDay() === 6; const isSun = d.getDay() === 0;
                          return (
                            <th key={i} className={`p-2 min-w-[60px] border-r border-gray-200 last:border-r-0 ${isSat ? 'bg-blue-50/50' : isSun ? 'bg-red-50/50' : ''}`}>
                              <div className={`text-sm font-black ${isSat ? 'text-blue-600' : isSun ? 'text-red-600' : 'text-gray-800'}`}>{d.getDate()}</div>
                              <div className={`text-[10px] font-bold ${isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-400'}`}>({['日','月','火','水','木','金','土'][d.getDay()]})</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.length === 0 ? (
                        <tr><td colSpan={16} className="py-20 text-gray-400 font-bold text-sm">設定された時間枠がありません</td></tr>
                      ) : (
                        timeSlots.map((time, rowIdx) => (
                          <tr key={time} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/20 transition-colors group">
                            <td className="p-2 border-r border-gray-200 text-xs font-bold text-gray-500 bg-gray-50/50 sticky left-0 z-10 group-hover:bg-blue-50/50 transition-colors">{time}</td>
                            
                            {displayDays.map((d, colIdx) => {
                              const available = isSlotAvailable(d, time);
                              const isSat = d.getDay() === 6; const isSun = d.getDay() === 0;
                              return (
                                <td key={colIdx} className={`p-1 border-r border-gray-100 last:border-0 ${isSat ? 'bg-blue-50/20' : isSun ? 'bg-red-50/20' : ''}`}>
                                  {available ? (
                                    <button onClick={() => { setSelectedDate(d); setSelectedTime(time); setStep(2); }} className="w-full h-10 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:scale-110 active:scale-95 transition-all text-blue-500 hover:text-blue-600 cursor-pointer">
                                      <span className="text-xl font-bold leading-none">◎</span>
                                    </button>
                                  ) : (
                                    <div className="w-full h-10 flex items-center justify-center rounded-lg text-gray-200">
                                      <span className="text-lg font-bold leading-none">×</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 border-l border-gray-200 text-xs font-bold text-gray-500 bg-gray-50/50 sticky right-0 z-10 group-hover:bg-blue-50/50 transition-colors">{time}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ゲスト情報入力フォーム */}
          {step === 2 && selectedTime && selectedDate && (
            <div className="p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar flex justify-center animate-in slide-in-from-right-8 duration-300">
              <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
                
                <button onClick={() => setStep(1)} type="button" className="w-fit flex items-center text-sm font-bold text-gray-400 hover:text-blue-600 mb-8 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> 日時選択に戻る
                </button>
                
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8 flex items-center shadow-inner">
                  <div className="bg-white p-3 rounded-xl shadow-sm mr-5 text-blue-600"><CalendarIcon className="w-7 h-7" /></div>
                  <div>
                    <div className="text-xs font-bold text-blue-500 mb-1 tracking-wide">選択された日時</div>
                    <div className="text-xl md:text-2xl font-black text-blue-900 tracking-tight">
                      {selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({['日','月','火','水','木','金','土'][selectedDate.getDay()]}) {selectedTime}
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleBook} className="space-y-6">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <label className="block text-sm font-black text-gray-700 mb-3 flex items-center"><Video className="w-4 h-4 mr-2 text-blue-500" />開催方法 <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必須</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <button type="button" onClick={() => setMeetingType('meet')} className={`py-3 text-xs font-bold rounded-xl border-2 transition-all ${meetingType === 'meet' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-white'}`}>Google Meet</button>
                      <button type="button" onClick={() => setMeetingType('zoom')} className={`py-3 text-xs font-bold rounded-xl border-2 transition-all ${meetingType === 'zoom' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-white'}`}>Zoom</button>
                      <button type="button" onClick={() => setMeetingType('inperson')} className={`py-3 text-xs font-bold rounded-xl border-2 transition-all ${meetingType === 'inperson' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-white'}`}>対面</button>
                      <button type="button" onClick={() => setMeetingType('other')} className={`py-3 text-xs font-bold rounded-xl border-2 transition-all ${meetingType === 'other' ? 'border-blue-500 bg-white text-blue-600 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-white'}`}>その他</button>
                    </div>
                    {meetingType === 'zoom' && ( <div className="relative animate-in fade-in slide-in-from-top-1"><LinkIcon className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" /><input type="url" value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} placeholder="Zoom URLをご記入ください" required className="w-full bg-white border-2 border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-blue-500 font-bold text-sm shadow-sm" /></div> )}
                    {meetingType === 'inperson' && ( <div className="relative animate-in fade-in slide-in-from-top-1"><MapPin className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" /><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="希望の場所・住所" required className="w-full bg-white border-2 border-gray-200 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-blue-500 font-bold text-sm shadow-sm" /></div> )}
                    {meetingType === 'other' && ( <div className="animate-in fade-in slide-in-from-top-1"><input type="text" value={otherDetails} onChange={(e) => setOtherDetails(e.target.value)} placeholder="開催方法の詳細" required className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm shadow-sm" /></div> )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-black text-gray-700 mb-2 flex items-center"><User className="w-4 h-4 mr-2 text-blue-500" />お名前 <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必須</span></label>
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="山田 太郎" />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-gray-700 mb-2 flex items-center"><Mail className="w-4 h-4 mr-2 text-blue-500" />メールアドレス <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必須</span></label>
                      <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="yamada@example.com" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" />電話番号 <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">任意</span></label>
                    <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="090-1234-5678" />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-gray-400" />共有事項・アジェンダ <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">任意</span></label>
                    <textarea rows={4} value={guestNotes} onChange={(e) => setGuestNotes(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none font-medium text-sm text-gray-800" placeholder="事前に伝えておきたいことがあればご記入ください" />
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100">
                    <button type="submit" disabled={isSubmitting || !guestName || !guestEmail} className="w-full py-4.5 rounded-xl text-white font-black text-lg shadow-lg hover:brightness-110 hover:-translate-y-1 active:translate-y-0 transition-all flex justify-center items-center disabled:opacity-50 disabled:hover:translate-y-0" style={{ backgroundColor: accentColor }}>
                      {isSubmitting ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : "予約を確定する"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}