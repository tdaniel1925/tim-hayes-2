import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.status
      }, { status: error.status || 400 })
    }

    return NextResponse.json({
      success: true,
      user: data.user?.email
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err)
    }, { status: 500 })
  }
}
