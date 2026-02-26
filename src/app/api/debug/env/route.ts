import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    // These are public anyway, so safe to expose
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    HAS_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    HAS_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    HAS_ANTHROPIC_KEY: !!process.env.ANTHROPIC_API_KEY,
    HAS_DEEPGRAM_KEY: !!process.env.DEEPGRAM_API_KEY,
    HAS_ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    NODE_ENV: process.env.NODE_ENV,
  })
}
