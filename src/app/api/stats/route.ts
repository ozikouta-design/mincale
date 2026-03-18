import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(req: Request) {
  try {
    // URLからリクエスト送信者のメールアドレスを取得し、あなた自身かチェック
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email !== 'oz.ikouta@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Service Role Key（管理者権限）を使ってクライアントを生成し、全データをカウント
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const [
      { count: usersCount },
      { count: todosCount },
      { count: groupsCount },
      { count: bookingsCount }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('todos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('groups').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true })
    ]);

    return NextResponse.json({
      users: usersCount || 0,
      todos: todosCount || 0,
      groups: groupsCount || 0,
      bookings: bookingsCount || 0
    });
  } catch (error: any) {
    console.error("Admin Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}