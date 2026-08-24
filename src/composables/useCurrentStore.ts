import { computed, ref, watch } from 'vue'
import { supabase } from '@/config/supabase'
import { isStoreRole, type StoreRole } from '@/utils/permissions'
import { useAuth } from './useAuth'

export type StoreMembership = {
  id: string
  storeId: string
  userId: string
  role: StoreRole
  storeName: string
  createdBy: string
}

const memberships = ref<StoreMembership[]>([])
const currentStoreId = ref<string | null>(null)
const loading = ref(false)
const loaded = ref(false)
let watching = false

function reset() {
  memberships.value = []
  currentStoreId.value = null
  loaded.value = false
}

function mapMembership(row: {
  id: string
  store_id: string
  user_id: string
  role: string
  store?: { id: string; name: string; created_by: string } | { id: string; name: string; created_by: string }[] | null
}): StoreMembership | null {
  if (!isStoreRole(row.role)) return null
  const store = Array.isArray(row.store) ? row.store[0] : row.store
  return {
    id: row.id,
    storeId: row.store_id,
    userId: row.user_id,
    role: row.role,
    storeName: store?.name?.trim() || 'ร้านของฉัน',
    createdBy: store?.created_by ?? '',
  }
}

async function loadMemberships() {
  const { user } = useAuth()
  if (!user.value) {
    reset()
    loaded.value = true
    return
  }

  loading.value = true
  try {
    const { data, error } = await supabase
      .from('store_members')
      .select('id, store_id, user_id, role')
      .eq('user_id', user.value.id)
      .order('created_at')

    if (error) throw error

    const storeIds = [...new Set((data || []).map((row) => row.store_id))]
    const storeNameById = new Map<string, { name: string; created_by: string }>()
    if (storeIds.length > 0) {
      const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, name, created_by')
        .in('id', storeIds)
      if (storeError) throw storeError
      for (const store of stores || []) {
        storeNameById.set(store.id, { name: store.name, created_by: store.created_by })
      }
    }

    memberships.value = (data || []).flatMap((row) => {
      const store = storeNameById.get(row.store_id)
      return mapMembership({
        ...row,
        store: store ? { id: row.store_id, name: store.name, created_by: store.created_by } : null,
      }) ?? []
    })

    const { data: profile } = await supabase
      .from('profiles')
      .select('last_store_id')
      .eq('id', user.value.id)
      .maybeSingle()

    const lastId = profile?.last_store_id
    const stillMember = lastId && memberships.value.some((item) => item.storeId === lastId)
    currentStoreId.value = stillMember
      ? lastId
      : (memberships.value[0]?.storeId ?? null)
  } catch (error) {
    console.error('Load store memberships error:', error)
    memberships.value = []
    currentStoreId.value = null
  } finally {
    loading.value = false
    loaded.value = true
  }
}

export function useCurrentStore() {
  const { user } = useAuth()

  const currentMembership = computed(
    () => memberships.value.find((item) => item.storeId === currentStoreId.value) ?? null,
  )
  const currentRole = computed(() => currentMembership.value?.role ?? null)
  const currentStoreName = computed(() => currentMembership.value?.storeName ?? '')
  const isStoreOwner = computed(
    () => !!user.value && currentMembership.value?.createdBy === user.value.id,
  )

  const selectStore = async (storeId: string) => {
    if (!memberships.value.some((item) => item.storeId === storeId)) return
    currentStoreId.value = storeId
    if (!user.value) return
    await supabase.from('profiles').update({ last_store_id: storeId }).eq('id', user.value.id)
  }

  const createStore = async (name?: string) => {
    const { data, error } = await supabase.rpc('create_store', {
      p_name: name?.trim() || null,
    })
    if (error) throw error
    await loadMemberships()
    if (data) currentStoreId.value = data
    return data
  }

  return {
    memberships,
    currentStoreId,
    currentMembership,
    currentRole,
    currentStoreName,
    isStoreOwner,
    loading,
    loaded,
    loadMemberships,
    selectStore,
    createStore,
  }
}

export function initStoreContext() {
  if (watching) return
  watching = true
  const { user } = useAuth()
  watch(
    user,
    async (value) => {
      if (!value) {
        reset()
        loaded.value = true
        return
      }
      loaded.value = false
      await loadMemberships()
    },
    { immediate: true },
  )
}
