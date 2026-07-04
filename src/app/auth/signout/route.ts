import { NextResponse, type NextRequest } from 'next/server';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (supabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
