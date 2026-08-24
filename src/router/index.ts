import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCurrentStore } from '@/composables/useCurrentStore'
import { usePermissions } from '@/composables/usePermissions'
import { setDocumentTitle } from '@/composables/usePageTitle'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresGuest: true, title: 'เข้าสู่ระบบ' },
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: { requiresGuest: true, title: 'ลืมรหัสผ่าน' },
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      meta: { requiresAuth: true, title: 'ตั้งรหัสผ่านใหม่' },
    },
    {
      path: '/invite/:token',
      name: 'Invite',
      component: () => import('@/views/auth/InviteView.vue'),
      meta: { title: 'คำเชิญเข้าร้าน' },
    },
    {
      path: '/onboarding',
      name: 'Onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { requiresAuth: true, title: 'เริ่มต้นใช้งาน' },
    },
    { path: '/', redirect: '/dashboard' },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'หน้าแรก' },
    },
    {
      path: '/ingredients',
      name: 'Ingredients',
      component: () => import('@/views/IngredientsView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'วัตถุดิบ' },
    },
    {
      path: '/packaging',
      name: 'Packaging',
      component: () => import('@/views/PackagingView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'บรรจุภัณฑ์' },
    },
    {
      path: '/suppliers',
      name: 'Suppliers',
      component: () => import('@/views/SuppliersView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'ซัพพลายเออร์' },
    },
    {
      path: '/menu',
      name: 'Menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'เมนู' },
    },
    {
      path: '/menu/new',
      name: 'MenuNew',
      component: () => import('@/views/MenuFormView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'เพิ่มเมนู' },
    },
    {
      path: '/menu/:id/edit',
      name: 'MenuEdit',
      component: () => import('@/views/MenuFormView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'แก้ไขเมนู' },
    },
    {
      path: '/menu/:id',
      name: 'MenuDetail',
      component: () => import('@/views/MenuDetailView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'เมนู' },
    },
    {
      path: '/comparison',
      name: 'Comparison',
      component: () => import('@/views/ComparisonView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'เปรียบเทียบ' },
    },
    {
      path: '/planning',
      name: 'Planning',
      component: () => import('@/views/PlanningView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'วางแผนการซื้อ' },
    },
    {
      path: '/combos',
      name: 'Combos',
      component: () => import('@/views/CombosView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'ชุดโปรโมชัน' },
    },
    {
      path: '/revenue',
      name: 'Revenue',
      component: () => import('@/views/RevenueView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'ประมาณการรายได้' },
    },
    {
      path: '/sales',
      name: 'Sales',
      component: () => import('@/views/SalesView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'ยอดขายจริง vs เป้า' },
    },
    {
      path: '/cashbook',
      name: 'Cashbook',
      component: () => import('@/views/CashbookView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'รายรับ-รายจ่าย' },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'ผู้ใช้' },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true, requiresStore: true, title: 'ตั้งค่าร้าน' },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true, title: 'โปรไฟล์' },
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true, title: 'เปลี่ยนรหัสผ่าน' },
    },
  ],
})

function waitWhile(source: { value: boolean }) {
  if (!source.value) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const stop = watch(source, (value) => {
      if (!value) {
        stop()
        resolve()
      }
    })
  })
}

router.beforeEach(async (to, _from, next) => {
  const { isAuthenticated, isPasswordRecovery, loading } = useAuth()
  const { loadMemberships, loaded, loading: storeLoading, currentStoreId } = useCurrentStore()
  const { isAdmin } = usePermissions()

  if (loading.value) await waitWhile(loading)

  if (isAuthenticated.value && !loaded.value) {
    await loadMemberships()
  }
  if (storeLoading.value) await waitWhile(storeLoading)

  if (isPasswordRecovery.value && isAuthenticated.value && to.name !== 'ResetPassword') {
    next({ name: 'ResetPassword' })
    return
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} })
    return
  }
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next(currentStoreId.value ? '/dashboard' : '/onboarding')
    return
  }
  if (to.meta.requiresStore && isAuthenticated.value && !currentStoreId.value) {
    next({ name: 'Onboarding' })
    return
  }
  if (to.meta.requiresAdmin && !isAdmin.value) {
    next('/dashboard')
    return
  }

  next()
})

router.afterEach((to) => {
  setDocumentTitle(to.meta.title)
})

export default router
