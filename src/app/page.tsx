import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Get user's role to determine where to redirect
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Redirect based on role
  if (userProfile?.role === 'super_admin') {
    redirect('/admin/tenants')
  } else {
    redirect('/dashboard/overview')
  }
}
