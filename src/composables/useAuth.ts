import { ref, computed } from 'vue'
import { supabase } from '@/config/supabase'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const isPasswordRecovery = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => {
    const metadata = user.value?.user_metadata ?? {}
    return (metadata.display_name as string | undefined)?.trim()
      || (metadata.full_name as string | undefined)?.trim()
      || ''
  })

  const initAuth = async () => {
    loading.value = true
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      session.value = currentSession
      user.value = currentSession?.user ?? null

      const url = new URL(window.location.href)
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
      if (hashParams.get('type') === 'recovery' || url.searchParams.get('type') === 'recovery') {
        isPasswordRecovery.value = true
      }

      supabase.auth.onAuthStateChange((event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        if (event === 'PASSWORD_RECOVERY') {
          isPasswordRecovery.value = true
        }
        if (event === 'SIGNED_OUT') {
          isPasswordRecovery.value = false
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      loading.value = false
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    isPasswordRecovery.value = false
    return data
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    isPasswordRecovery.value = false
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    isPasswordRecovery.value = false
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const email = user.value?.email
    if (!email) throw new Error('ไม่พบอีเมลผู้ใช้')

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (verifyError) throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง')

    await updatePassword(newPassword)
  }

  const updateProfile = async (name: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    })
    if (error) throw error
    user.value = data.user
    return data.user
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    isPasswordRecovery,
    displayName,
    initAuth,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    changePassword,
    updateProfile,
  }
}
