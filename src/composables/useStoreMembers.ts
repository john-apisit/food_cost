import { computed, ref } from 'vue'
import { supabase } from '@/config/supabase'
import { isStoreRole, type StoreRole } from '@/utils/permissions'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'

export type StoreMemberRow = {
  id: string
  userId: string
  role: StoreRole
  email: string
  displayName: string
  createdAt: string
  isOwner: boolean
}

export type StoreInviteRow = {
  id: string
  email: string
  role: StoreRole
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expiresAt: string
  createdAt: string
}

const members = ref<StoreMemberRow[]>([])
const invites = ref<StoreInviteRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useStoreMembers() {
  const { user } = useAuth()
  const { currentStoreId, currentMembership, loadMemberships, selectStore } = useCurrentStore()
  const currentUserId = computed(() => user.value?.id ?? '')

  const fetchMembers = async () => {
    const storeId = currentStoreId.value
    if (!storeId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('store_members')
        .select('id, user_id, role, created_at')
        .eq('store_id', storeId)
        .order('created_at')
      if (fetchError) throw fetchError

      const userIds = [...new Set((data || []).map((row) => row.user_id))]
      const profileById = new Map<string, { email: string; display_name: string | null }>()
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .in('id', userIds)
        if (profileError) throw profileError
        for (const profile of profiles || []) {
          profileById.set(profile.id, { email: profile.email, display_name: profile.display_name })
        }
      }

      const ownerId = currentMembership.value?.createdBy ?? ''
      members.value = (data || []).flatMap((row) => {
        if (!isStoreRole(row.role)) return []
        const profile = profileById.get(row.user_id)
        return [{
          id: row.id,
          userId: row.user_id,
          role: row.role,
          email: profile?.email || '',
          displayName: profile?.display_name?.trim() || '',
          createdAt: row.created_at,
          isOwner: row.user_id === ownerId,
        }]
      })
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดรายชื่อไม่สำเร็จ'
      members.value = []
    } finally {
      loading.value = false
    }
  }

  const fetchInvites = async () => {
    const storeId = currentStoreId.value
    if (!storeId) return
    const { data, error: fetchError } = await supabase
      .from('store_invites')
      .select('id, email, role, token, status, expires_at, created_at')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (fetchError) throw fetchError
    invites.value = (data || []).flatMap((row) => {
      if (!isStoreRole(row.role)) return []
      return [{
        id: row.id,
        email: row.email,
        role: row.role,
        token: row.token,
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }]
    })
  }

  const inviteMember = async (email: string, role: StoreRole) => {
    const storeId = currentStoreId.value
    if (!storeId) throw new Error('ยังไม่ได้เลือกร้าน')
    const { data, error: fnError } = await supabase.functions.invoke('invite-member', {
      body: { store_id: storeId, email: email.trim(), role },
    })
    const payload = data as {
      error?: string
      email_sent?: boolean
      email_error?: string | null
      ok?: boolean
      token?: string
      invite_url?: string
    } | null
    if (fnError) throw new Error(payload?.error || fnError.message)
    if (payload?.error) throw new Error(payload.error)
    await Promise.all([fetchMembers(), fetchInvites()])
    return payload
  }

  const updateMemberRole = async (memberId: string, role: StoreRole) => {
    const { error: updateError } = await supabase
      .from('store_members')
      .update({ role })
      .eq('id', memberId)
    if (updateError) throw updateError
    await fetchMembers()
  }

  const removeMember = async (memberId: string) => {
    const { error: deleteError } = await supabase
      .from('store_members')
      .delete()
      .eq('id', memberId)
    if (deleteError) throw deleteError
    members.value = members.value.filter((item) => item.id !== memberId)
  }

  const leaveCurrentStore = async () => {
    const membership = currentMembership.value
    if (!user.value || !membership) throw new Error('ยังไม่ได้เลือกร้าน')
    if (membership.createdBy === user.value.id) {
      throw new Error('เจ้าของร้านไม่สามารถออกจากร้านของตัวเองได้')
    }

    const { error: deleteError } = await supabase
      .from('store_members')
      .delete()
      .eq('id', membership.id)
      .eq('user_id', user.value.id)
    if (deleteError) throw deleteError

    members.value = []
    invites.value = []
    await loadMemberships()
  }

  const cancelInvite = async (inviteId: string) => {
    const { error: updateError } = await supabase
      .from('store_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
    if (updateError) throw updateError
    invites.value = invites.value.filter((item) => item.id !== inviteId)
  }

  const acceptInvite = async (token: string) => {
    const { data, error: rpcError } = await supabase.rpc('accept_store_invite', {
      p_token: token,
    })
    if (rpcError) throw rpcError
    await loadMemberships()
    if (data) await selectStore(data)
    return data
  }

  return {
    members,
    invites,
    loading,
    error,
    currentUserId,
    fetchMembers,
    fetchInvites,
    inviteMember,
    updateMemberRole,
    removeMember,
    leaveCurrentStore,
    cancelInvite,
    acceptInvite,
  }
}
