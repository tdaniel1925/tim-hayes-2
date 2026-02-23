import { redirect } from 'next/navigation'
import { verifyAuth } from '@/lib/auth'
import { UserProvider } from '@/lib/context/user-context'
import { ProtectedLayoutClient } from '@/components/layout/protected-layout-client'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side authentication check
  let user
  try {
    user = await verifyAuth()
  } catch {
    // If auth fails, redirect to login
    redirect('/login')
  }

  // If we get here, user is authenticated
  return (
    <UserProvider user={user}>
      <ProtectedLayoutClient>{children}</ProtectedLayoutClient>
    </UserProvider>
  )
}
