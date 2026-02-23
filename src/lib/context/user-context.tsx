'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { AuthUser } from '@/lib/auth'

interface UserContextType {
  user: AuthUser
}

const UserContext = createContext<UserContextType | null>(null)

interface UserProviderProps {
  user: AuthUser
  children: ReactNode
}

export function UserProvider({ user, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context.user
}
