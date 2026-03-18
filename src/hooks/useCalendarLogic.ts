import { useState, useEffect, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { Group, Todo } from "@/types";
import { useTodoLogic } from "./useTodoLogic";
import { useEventLogic, getDayIndex } from "./useEventLogic";
import { useDragDropLogic } from "./useDragDropLogic";
import toast from "react-hot-toast";
import { DEFAULT_HOUR_HEIGHT } from "@/constants/calendar";

export function useCalendarLogic() {
  const { data: session, status } = useSession();

  // ---------- Haptics ----------
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);
  const [syncMonths, setSyncMonths] = useState<number>(3);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = localStorage.getItem("mincale_haptics");
    if (h !== null) setIsHapticsEnabled(h === "true");
    const s = localStorage.getItem("mincale_sync_months");
    if (s !== null) setSyncMonths(Number(s));
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
      setIsRightPanelOpen(true);
    }
  }, []);

  const triggerHaptic = () => {
    if (isHapticsEnabled && typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const toggleHaptics = (enabled: boolean) => {
    setIsHapticsEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("mincale_haptics", String(enabled));
      if (enabled && navigator.vibrate) navigator.vibrate(15);
    }
  };

  const handleSyncMonthsChange = (val: number) => {
    setSyncMonths(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("mincale_sync_months", String(val));
    }
    toast.success("同期期間を変更しました。再同期ボタンで即時反映できます。");
    triggerHaptic();
  };

  // ---------- UI state ----------
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [activeTab, setActiveTab] = useState<"todo" | "settings">("todo");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [currentMonthYear, setCurrentMonthYear] = useState("");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // ---------- Groups ----------
  const [groups, setGroups] = useState<Group[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // ---------- Booking ----------
  const [bookingTitle, setBookingTitle] = useState("ミーティングの予約");
  const [bookingDuration, setBookingDuration] = useState(30);
  const [bookingStartHour, setBookingStartHour] = useState(10);
  const [bookingEndHour, setBookingEndHour] = useState(18);
  const [bookingDays, setBookingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bookingLeadTime, setBookingLeadTime] = useState(24);
  const [weekStartDay, setWeekStartDay] = useState(0);
  const [profileId, setProfileId] = useState("");

  // ---------- Calendar days ----------
  const { days, months, timeMin, timeMax } = useMemo(() => {
    const today = new Date();
    const tempDays: { dayIndex: number; label: string; isToday: boolean; date: Date }[] = [];
    const tempMonths: { year: number; month: number; monthIndex: number; date: Date }[] = [];
    const fetchStart = new Date(today.getFullYear(), today.getMonth() - syncMonths, 1);
    const fetchEnd = new Date(today.getFullYear(), today.getMonth() + syncMonths + 1, 0, 23, 59, 59);
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - syncMonths * 30);
    let dayOffset = startDay.getDay() - weekStartDay;
    if (dayOffset < 0) dayOffset += 7;
    startDay.setDate(startDay.getDate() - dayOffset);
    const totalDays = (syncMonths * 2 + 1) * 31;
    for (let i = 0; i < totalDays; i++) {
      const current = new Date(startDay);
      current.setDate(startDay.getDate() + i);
      tempDays.push({
        dayIndex: getDayIndex(current),
        label: current.getDate().toString(),
        isToday: getDayIndex(current) === getDayIndex(today),
        date: current,
      });
    }
    for (let i = -syncMonths; i <= syncMonths; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      tempMonths.push({ year: d.getFullYear(), month: d.getMonth(), monthIndex: d.getFullYear() * 100 + d.getMonth(), date: d });
    }
    return { days: tempDays, months: tempMonths, timeMin: fetchStart.toISOString(), timeMax: fetchEnd.toISOString() };
  }, [weekStartDay, syncMonths]);

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

  // ---------- Sub-hooks ----------
  const todoLogic = useTodoLogic(session, triggerHaptic);
  const eventLogic = useEventLogic(session, status, triggerHaptic, timeMin, timeMax, accentColor);

  const dragDropLogic = useDragDropLogic({
    session,
    triggerHaptic,
    todos: todoLogic.todos,
    setTodos: todoLogic.setTodos,
    events: eventLogic.events,
    setEvents: eventLogic.setEvents,
    selectedMemberIds: eventLogic.selectedMemberIds,
    setSelectedMemberIds: eventLogic.setSelectedMemberIds,
    newEventMemberId: eventLogic.newEventMemberId,
    members: eventLogic.members,
    setIsRightPanelOpen,
  });

  // ---------- Data fetching ----------
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.email) { setIsLoadingData(false); return; }
      setIsLoadingData(true);
      try {
        const { data: todosData } = await supabase
          .from("todos").select("*").eq("user_email", session.user.email).order("id", { ascending: true });
        if (todosData) todoLogic.setTodos(todosData as Todo[]);

        const { data: groupsData } = await supabase
          .from("groups").select("*").eq("user_email", session.user.email).order("id", { ascending: true });
        if (groupsData) setGroups(groupsData.map((g) => ({ id: g.id.toString(), name: g.name, memberIds: g.member_ids })));

        const { data: profileData } = await supabase
          .from("profiles").select("*").eq("email", session.user.email).single();
        if (profileData) {
          setProfileId(profileData.id || profileData.email);
          if (profileData.booking_title) setBookingTitle(profileData.booking_title);
          if (profileData.booking_duration) setBookingDuration(profileData.booking_duration);
          if (profileData.booking_start_hour != null) setBookingStartHour(profileData.booking_start_hour);
          if (profileData.booking_end_hour != null) setBookingEndHour(profileData.booking_end_hour);
          if (profileData.booking_days) setBookingDays(profileData.booking_days);
          if (profileData.booking_lead_time != null) setBookingLeadTime(profileData.booking_lead_time);
          if (profileData.week_start_day != null) setWeekStartDay(profileData.week_start_day);
        }
      } catch (error) {
        console.error(error);
        toast.error("データの読み込みに失敗しました");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [session]);

  // ---------- Booking settings ----------
  const handleSaveBookingSettings = async () => {
    if (!session?.user?.email) return;
    const { error } = await supabase.from("profiles").update({
      booking_title: bookingTitle,
      booking_duration: bookingDuration,
      booking_start_hour: bookingStartHour,
      booking_end_hour: bookingEndHour,
      booking_days: bookingDays,
      booking_lead_time: bookingLeadTime,
      week_start_day: weekStartDay,
    }).eq("email", session.user.email);
    if (!error) { toast.success("設定を保存しました！"); triggerHaptic(); }
    else toast.error("設定の保存に失敗しました");
  };

  // ---------- Groups ----------
  const handleCreateGroupClick = () => {
    setEditingGroupId(null); setNewGroupName(""); setNewGroupMemberIds([]);
    setIsGroupModalOpen(true); triggerHaptic();
  };
  const handleEditGroupClick = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroupId(group.id); setNewGroupName(group.name); setNewGroupMemberIds(group.memberIds);
    setIsGroupModalOpen(true); triggerHaptic();
  };
  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false); setEditingGroupId(null); setNewGroupName(""); setNewGroupMemberIds([]);
  };
  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || newGroupMemberIds.length === 0 || !session?.user?.email) return;
    if (editingGroupId) {
      const { data, error } = await supabase.from("groups")
        .update({ name: newGroupName, member_ids: newGroupMemberIds })
        .eq("id", parseInt(editingGroupId, 10)).select().single();
      if (!error && data) {
        setGroups((prev) => prev.map((g) => g.id === editingGroupId ? { id: data.id.toString(), name: data.name, memberIds: data.member_ids } : g));
        toast.success("グループを更新しました"); triggerHaptic();
      } else toast.error("グループの更新に失敗しました");
    } else {
      const { data, error } = await supabase.from("groups")
        .insert({ name: newGroupName, member_ids: newGroupMemberIds, user_email: session.user.email })
        .select().single();
      if (!error && data) {
        setGroups((prev) => [...prev, { id: data.id.toString(), name: data.name, memberIds: data.member_ids }]);
        toast.success("グループを作成しました"); triggerHaptic();
      } else toast.error("グループの作成に失敗しました");
    }
    handleCloseGroupModal();
  };
  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("groups").delete().eq("id", parseInt(groupId, 10));
    if (!error) { setGroups((prev) => prev.filter((g) => g.id !== groupId)); toast.success("グループを削除しました"); triggerHaptic(); }
    else toast.error("グループの削除に失敗しました");
  };

  // ---------- Clipboard / free time ----------
  const getCommonFreeTimeText = () => {
    const freeSlots: string[] = [];
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + bookingLeadTime * 3600000);
    const visibleDays = days.filter((d) => d.dayIndex >= getDayIndex(now) && bookingDays.includes(d.date.getDay()));
    let addedDaysCount = 0;

    for (let di = 0; di < visibleDays.length; di++) {
      if (addedDaysCount >= 5) break;
      const dt = visibleDays[di].date;
      const dateStr = `${dt.getMonth() + 1}/${dt.getDate()}(${["日","月","火","水","木","金","土"][dt.getDay()]})`;
      let currentMin = bookingStartHour * 60;
      const endMin = bookingEndHour * 60;
      const dayFreeBlocks: string[] = [];
      let blockStart = -1, blockEnd = -1;

      while (currentMin < endMin) {
        if (currentMin + bookingDuration > endMin) break;
        const h = Math.floor(currentMin / 60), m = currentMin % 60;
        const slotStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), h, m, 0);
        let occupied = slotStart <= minBookingTime;

        if (!occupied) {
          for (const event of eventLogic.events) {
            if (eventLogic.selectedMemberIds.includes(event.memberId) && event.dayIndex === visibleDays[di].dayIndex) {
              const slotStartH = currentMin / 60, slotEndH = (currentMin + bookingDuration) / 60;
              if (slotStartH < event.startHour + event.duration && slotEndH > event.startHour) {
                occupied = true; break;
              }
            }
          }
        }

        if (!occupied) {
          if (blockStart === -1) { blockStart = currentMin; blockEnd = currentMin + bookingDuration; }
          else blockEnd = currentMin + bookingDuration;
        } else {
          if (blockStart !== -1) {
            const fmt = (n: number) => Math.floor(n / 60).toString().padStart(2, "0") + ":" + (n % 60).toString().padStart(2, "0");
            dayFreeBlocks.push(`${fmt(blockStart)}〜${fmt(blockEnd)}`);
            blockStart = -1;
          }
        }
        currentMin += bookingDuration;
      }
      if (blockStart !== -1) {
        const fmt = (n: number) => Math.floor(n / 60).toString().padStart(2, "0") + ":" + (n % 60).toString().padStart(2, "0");
        dayFreeBlocks.push(`${fmt(blockStart)}〜${fmt(blockEnd)}`);
      }
      if (dayFreeBlocks.length > 0) { freeSlots.push(`・${dateStr} ${dayFreeBlocks.join(", ")}`); addedDaysCount++; }
    }

    if (freeSlots.length === 0) freeSlots.push("※現在ご提示できる直近の空き日程がありません。恐れ入りますがリンクからカレンダーをご確認ください。");
    const userSlug = session?.user?.email ? session.user.email.split("@")[0] : profileId;
    const bookingUrl = typeof window !== "undefined" ? `${window.location.origin}/t/${userSlug}` : `https://mincale.app/t/${userSlug}`;
    return `お世話になっております。\n次回のお打ち合わせにつきまして、以下の日程でご都合のよろしい日時はございますでしょうか？\n\n${freeSlots.join("\n")}\n\n▼ こちらの専用リンクから、ご都合の良い時間を直接ご予約いただけます：\n${bookingUrl}\n\nご検討のほど、よろしくお願いいたします。`;
  };

  const handleCopyToClipboard = async (textToCopy?: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy !== undefined ? textToCopy : getCommonFreeTimeText());
      setIsCopied(true);
      triggerHaptic();
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("クリップボードにコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  return {
    session, status, signIn, signOut,
    viewMode, setViewMode,
    activeTab, setActiveTab,
    isSidebarOpen, setIsSidebarOpen,
    isRightPanelOpen, setIsRightPanelOpen,
    isScheduleModalOpen, setIsScheduleModalOpen,
    isGroupModalOpen, setIsGroupModalOpen,
    newGroupName, setNewGroupName,
    newGroupMemberIds, setNewGroupMemberIds,
    groups, setGroups,
    currentMonthYear, setCurrentMonthYear,
    accentColor, setAccentColor,
    hourHeight, setHourHeight,
    isCopied, setIsCopied,
    isLoadingData, setIsLoadingData,
    bookingTitle, setBookingTitle,
    bookingDuration, setBookingDuration,
    bookingStartHour, setBookingStartHour,
    bookingEndHour, setBookingEndHour,
    bookingDays, setBookingDays,
    bookingLeadTime, setBookingLeadTime,
    weekStartDay, setWeekStartDay,
    syncMonths, handleSyncMonthsChange,
    isHapticsEnabled, toggleHaptics,
    days, months, hours, todayDate: new Date().getDate(),
    handleSaveBookingSettings,
    handleCreateGroupClick, handleEditGroupClick,
    handleCloseGroupModal, handleSaveGroup, handleDeleteGroup,
    getCommonFreeTimeText, handleCopyToClipboard,
    ...todoLogic,
    ...eventLogic,
    ...dragDropLogic,
  };
}
