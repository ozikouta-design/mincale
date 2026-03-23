import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!supabase) return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
    const { slug } = await params;
    const { data: profile } = await supabase.from('profiles').select('name, booking_duration, booking_start_hour, booking_end_hour, booking_days, booking_lead_time, week_start_day').eq('slug', slug).single();
    if (!profile) return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 404 });
    
    return NextResponse.json({
      name: profile.name,
      duration: profile.booking_duration || 30,
      startHour: profile.booking_start_hour ?? 10,
      endHour: profile.booking_end_hour ?? 18,
      days: profile.booking_days || [1, 2, 3, 4, 5],
      leadTime: profile.booking_lead_time ?? 24,
      weekStartDay: profile.week_start_day ?? 0
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}