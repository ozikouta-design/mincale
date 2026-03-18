"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, CheckSquare, Folder, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [stats, setStats] = useState({ users: 0, todos: 0, groups: 0, bookings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // アクセスを許可する管理者メールアドレス
  const ADMIN_EMAIL = "oz.ikouta@gmail.com";

  useEffect(() => {
    if (status === "loading") return;

    // 管理者以外はトップページに強制送還
    if (!session || session.user?.email !== ADMIN_EMAIL) {
      router.replace("/");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/admin/stats?email=${session.user.email}`);
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("統計データの取得に失敗しました", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session, status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 強制送還の処理が完了するまでは何も表示しない
  if (session?.user?.email !== ADMIN_EMAIL) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1">開発者ダッシュボード</h1>
            <p className="text-sm font-bold text-gray-500">システム全体の利用状況を監視しています</p>
          </div>
          <Link href="/" className="w-fit flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            カレンダーに戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">総ユーザー数</p>
            <p className="text-4xl font-black text-gray-900">{stats.users}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">成立した予約数</p>
            <p className="text-4xl font-black text-gray-900">{stats.bookings}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">登録されたToDo</p>
            <p className="text-4xl font-black text-gray-900">{stats.todos}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
              <Folder className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">作成されたグループ</p>
            <p className="text-4xl font-black text-gray-900">{stats.groups}</p>
          </div>
        </div>

      </div>
    </div>
  );
}