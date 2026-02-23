import { redirect } from 'next/navigation'
import { verifyAuth } from '@/lib/auth'
import { UserProvider } from '@/lib/context/user-context'
import { Sidebar } from '@/components/sidebar'

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
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0F1117]">{children}</main>
      </div>
    </UserProvider>
  )
}
