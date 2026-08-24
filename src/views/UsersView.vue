<template>
  <MainLayout>
    <div class="max-w-3xl space-y-6">
      <div>
        <h1 class="page-title">ผู้ใช้</h1>
        <p class="text-gray-500 mt-1">เชิญคนเข้ามาช่วยดูแลร้านนี้ และกำหนดสิทธิ์ตามบทบาท</p>
      </div>

      <form class="card p-6 space-y-4" @submit.prevent="sendInvite">
        <h2 class="font-semibold text-lg">เชิญสมาชิก</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">อีเมล</label>
            <input v-model="inviteEmail" type="email" required class="input-field w-full" placeholder="name@email.com" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">บทบาท</label>
            <select v-model="inviteRole" class="input-field w-full">
              <option value="store_manager">{{ STORE_ROLE_LABELS.store_manager }}</option>
              <option value="admin">{{ STORE_ROLE_LABELS.admin }}</option>
            </select>
          </div>
        </div>
        <p class="text-sm text-gray-500">
          ผู้จัดการร้านแก้ไขข้อมูลร้านได้เหมือนผู้ดูแล แต่เชิญหรือถอดผู้ใช้ไม่ได้
        </p>
        <button type="submit" class="btn-primary" :disabled="inviting">
          {{ inviting ? 'กำลังส่งคำเชิญ...' : 'ส่งอีเมลเชิญ' }}
        </button>
        <div v-if="inviteNotice" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <p class="text-sm text-amber-900">{{ inviteNotice.message }}</p>
          <div class="flex flex-col sm:flex-row gap-2">
            <input :value="inviteNotice.url" readonly class="input-field w-full text-sm" />
            <button type="button" class="btn-secondary text-sm shrink-0" @click="copyInviteLink(inviteNotice.url)">
              คัดลอกลิงก์
            </button>
          </div>
        </div>
      </form>

      <section class="card p-6 space-y-3">
        <h2 class="font-semibold text-lg">สมาชิกในร้าน</h2>
        <p v-if="loading" class="text-gray-500">กำลังโหลด...</p>
        <ul v-else class="divide-y divide-gray-100">
          <li v-for="member in members" :key="member.id" class="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">{{ member.displayName || member.email || 'ไม่มีชื่อ' }}</p>
              <p class="text-sm text-gray-500 truncate">{{ member.email }}</p>
            </div>
            <div class="flex items-center gap-2">
              <select
                class="input-field"
                :value="member.role"
                :disabled="member.isOwner || member.userId === currentUserId"
                @change="onRoleChange(member.id, $event)"
              >
                <option value="admin">{{ STORE_ROLE_LABELS.admin }}</option>
                <option value="store_manager">{{ STORE_ROLE_LABELS.store_manager }}</option>
              </select>
              <span v-if="member.isOwner" class="text-xs text-gray-500">เจ้าของร้าน</span>
              <button
                v-else-if="member.userId !== currentUserId"
                type="button"
                class="btn-danger text-sm"
                @click="onRemove(member.id)"
              >
                ถอด
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="invites.length" class="card p-6 space-y-3">
        <h2 class="font-semibold text-lg">คำเชิญที่รอตอบรับ</h2>
        <ul class="divide-y divide-gray-100">
          <li v-for="invite in invites" :key="invite.id" class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p class="font-medium">{{ invite.email }}</p>
              <p class="text-sm text-gray-500">{{ STORE_ROLE_LABELS[invite.role] }} · หมดอายุ {{ formatDate(invite.expiresAt) }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button type="button" class="btn-secondary text-sm" @click="copyInviteLink(inviteUrl(invite.token))">
                คัดลอกลิงก์
              </button>
              <button type="button" class="btn-secondary text-sm" @click="onCancel(invite.id)">ยกเลิก</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useStoreMembers } from '@/composables/useStoreMembers'
import { useToast } from '@/composables/useToast'
import { STORE_ROLE_LABELS, isStoreRole, type StoreRole } from '@/utils/permissions'
import { formatDate } from '@/utils/format'

const {
  members,
  invites,
  loading,
  currentUserId,
  fetchMembers,
  fetchInvites,
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvite,
} = useStoreMembers()
const { success, error } = useToast()

const inviteEmail = ref('')
const inviteRole = ref<StoreRole>('store_manager')
const inviting = ref(false)
const inviteNotice = ref<{ message: string; url: string } | null>(null)

const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`

const copyInviteLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    success('คัดลอกลิงก์แล้ว')
  } catch {
    error('คัดลอกลิงก์ไม่สำเร็จ')
  }
}

const sendInvite = async () => {
  inviting.value = true
  inviteNotice.value = null
  try {
    const result = await inviteMember(inviteEmail.value, inviteRole.value)
    inviteEmail.value = ''
    const url = result?.invite_url || (result?.token ? inviteUrl(result.token) : '')
    if (result?.email_sent === false) {
      inviteNotice.value = {
        message: result.email_error
          ? `สร้างคำเชิญแล้ว แต่ส่งอีเมลไม่สำเร็จ: ${result.email_error}`
          : 'สร้างคำเชิญแล้ว แต่ส่งอีเมลไม่สำเร็จ คัดลอกลิงก์ส่งให้ผู้ถูกเชิญแทน',
        url,
      }
      error('ส่งอีเมลไม่สำเร็จ คัดลอกลิงก์ด้านล่างแทนได้')
    } else {
      success('ส่งคำเชิญแล้ว')
    }
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ส่งคำเชิญไม่สำเร็จ')
  } finally {
    inviting.value = false
  }
}

const onRoleChange = async (memberId: string, event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || !isStoreRole(target.value)) return
  try {
    await updateMemberRole(memberId, target.value)
    success('เปลี่ยนบทบาทแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'เปลี่ยนบทบาทไม่สำเร็จ')
    await fetchMembers()
  }
}

const onRemove = async (memberId: string) => {
  if (!confirm('ถอดสมาชิกคนนี้ออกจากร้าน?')) return
  try {
    await removeMember(memberId)
    success('ถอดสมาชิกแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ถอดสมาชิกไม่สำเร็จ')
  }
}

const onCancel = async (inviteId: string) => {
  try {
    await cancelInvite(inviteId)
    success('ยกเลิกคำเชิญแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ')
  }
}

onMounted(async () => {
  await Promise.all([fetchMembers(), fetchInvites()])
})
</script>
