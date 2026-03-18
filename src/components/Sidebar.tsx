"use client";

import React, { useState, memo } from "react";
import { Plus, Users, Search, Folder, Calendar as CalendarIcon, LogOut, LogIn, Check, X, Pencil, Trash2 } from "lucide-react";
import { useCalendar } from "@/context/CalendarContext";
import { Group } from "@/types";

const Sidebar = memo(function Sidebar() {
  const {
    isSidebarOpen, setIsSidebarOpen,
    members, toggleMember, selectedMemberIds, toggleSelectAllMembers, setSelectedMemberIds,
    groups, handleDeleteGroup, handleCreateGroupClick, handleEditGroupClick,
    session, signOut, signIn, accentColor,
  } = useCalendar();

  const [searchTerm, setSearchTerm] = useState("");
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className={`fixed md:relative z-40 inset-y-0 left-0 h-full flex-shrink-0 bg-[#f5f5f7] border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden border-none"}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md mr-3" style={{ backgroundColor: accentColor }}>
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">みんカレ</span>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6 whitespace-nowrap">
        <div className="relative group">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-500" />
          <input
            type="text"
            placeholder="メンバーを検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-gray-500 tracking-wider flex items-center">
              <Folder className="w-4 h-4 mr-1.5" />グループ
            </h3>
            <button onClick={handleCreateGroupClick} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {groups.map((group: Group) => (
              <div
                key={group.id}
                onClick={() => setSelectedMemberIds(group.memberIds)}
                className="flex items-center justify-between px-3 py-2 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-200 group/item cursor-pointer"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-gray-700 truncate">{group.name}</span>
                  <span className="text-[10px] text-gray-400">{group.memberIds.length}人</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button onClick={(e) => handleEditGroupClick(group, e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => handleDeleteGroup(group.id, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {groups.length === 0 && <div className="text-xs text-gray-400 text-center py-2">グループはありません</div>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-gray-500 tracking-wider flex items-center">
              <Users className="w-4 h-4 mr-1.5" />メンバー
            </h3>
            <button onClick={toggleSelectAllMembers} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md transition-colors">
              {selectedMemberIds.length === members.length && members.length > 0 ? "すべて解除" : "すべて選択"}
            </button>
          </div>
          <div className="space-y-1">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`w-full flex items-center px-2 py-2 rounded-xl transition-all ${selectedMemberIds.includes(member.id) ? "bg-white shadow-sm border border-gray-200" : "hover:bg-gray-200 border border-transparent"}`}
              >
                <div
                  className={`w-4 h-4 rounded shadow-sm mr-3 flex items-center justify-center transition-colors ${selectedMemberIds.includes(member.id) ? "text-white" : "border border-gray-300 bg-white"}`}
                  style={selectedMemberIds.includes(member.id) ? { backgroundColor: member.colorHex || accentColor } : {}}
                >
                  {selectedMemberIds.includes(member.id) && <Check className="w-3 h-3" />}
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm mr-2" style={{ backgroundColor: member.colorHex || accentColor }}>
                  {member.initials}
                </div>
                <span className={`text-sm flex-1 text-left truncate transition-colors ${selectedMemberIds.includes(member.id) ? "font-bold text-gray-800" : "font-medium text-gray-600"}`}>
                  {member.name}
                </span>
              </button>
            ))}
            {filteredMembers.length === 0 && <div className="text-xs text-gray-400 text-center py-2">見つかりません</div>}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white whitespace-nowrap">
        {session ? (
          <>
            <div className="flex items-center mb-4 px-2">
              {session.user?.image
                ? <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full shadow-sm" />
                : <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">{session.user?.name?.charAt(0) || "U"}</div>
              }
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold text-gray-800 truncate">{session.user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{session.user?.email}</p>
              </div>
            </div>
            <button onClick={() => signOut()} className="w-full flex items-center justify-center py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
              <LogOut className="w-4 h-4 mr-2" />ログアウト
            </button>
          </>
        ) : (
          <button onClick={() => signIn("google")} className="w-full flex items-center justify-center py-3 text-sm font-bold text-white rounded-xl shadow-sm hover:brightness-110 transition-all" style={{ backgroundColor: accentColor }}>
            <LogIn className="w-4 h-4 mr-2" />Googleでログイン
          </button>
        )}
      </div>
    </aside>
  );
});

export default Sidebar;
