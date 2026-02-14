import { supabase } from './supabase'

export type UserRole = 'candidate' | 'interviewer' | 'admin'

export interface User {
  id: string
  email: string
  role: UserRole
}

export async function signUp(email: string, password: string, role: UserRole = 'candidate') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    // Store user role in users table
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email: email,
        role: role
      })
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Get user role from users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email || '',
      role: userData?.role || 'candidate'
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    return data?.role || 'candidate'
  } catch (error) {
    return 'candidate'
  }
}

