import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useNavigate } from '@tanstack/react-router'
import { useAvailabilityStore } from './stores/availabilityStore'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Reset store when user changes (SIGNED_IN event with different user)
      if (event === 'SIGNED_IN' && session?.user?.id !== user?.id) {
        useAvailabilityStore.getState().resetStore()
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    // Reset store before signing in new user
    useAvailabilityStore.getState().resetStore()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error && data.session) {
      setUser(data.user)
      setSession(data.session)
    }

    return { error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (!error && data.session) {
      setUser(data.user)
      setSession(data.session)

      // Create user profile in backend
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`
          },
          body: JSON.stringify({
            name,
            email,
          })
        })

        if (!response.ok) {
          console.error('Failed to create user profile')
        }
      } catch (err) {
        console.error('Error creating user profile:', err)
      }
    }

    return { error }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      // Clear state regardless of error
      setUser(null)
      setSession(null)
      // Reset the availability store to clear cached data
      useAvailabilityStore.getState().resetStore()
      // Navigate to login page
      navigate({ to: '/' })
    } catch (err) {
      console.error('Sign out failed:', err)
      // Clear state even if there's an error
      setUser(null)
      setSession(null)
      // Reset the availability store to clear cached data
      useAvailabilityStore.getState().resetStore()
      navigate({ to: '/' })
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!session,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}