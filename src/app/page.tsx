import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to admin - the page will handle role-based routing
  // Middleware will catch if user is not authenticated
  redirect('/admin')
}
