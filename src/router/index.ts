import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
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
    { path: '/', redirect: '/dashboard' },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, title: 'หน้าแรก' },
    },
    {
      path: '/ingredients',
      name: 'Ingredients',
      component: () => import('@/views/IngredientsView.vue'),
      meta: { requiresAuth: true, title: 'วัตถุดิบ' },
    },
    {
      path: '/packaging',
      name: 'Packaging',
      component: () => import('@/views/PackagingView.vue'),
      meta: { requiresAuth: true, title: 'บรรจุภัณฑ์' },
    },
    {
      path: '/menu',
      name: 'Menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { requiresAuth: true, title: 'เมนู' },
    },
    {
      path: '/menu/new',
      name: 'MenuNew',
      component: () => import('@/views/MenuFormView.vue'),
      meta: { requiresAuth: true, title: 'เพิ่มเมนู' },
    },
    {
      path: '/menu/:id/edit',
      name: 'MenuEdit',
      component: () => import('@/views/MenuFormView.vue'),
      meta: { requiresAuth: true, title: 'แก้ไขเมนู' },
    },
    {
      path: '/menu/:id',
      name: 'MenuDetail',
      component: () => import('@/views/MenuDetailView.vue'),
      meta: { requiresAuth: true, title: 'เมนู' },
    },
    {
      path: '/comparison',
      name: 'Comparison',
      component: () => import('@/views/ComparisonView.vue'),
      meta: { requiresAuth: true, title: 'เปรียบเทียบ' },
    },
    {
      path: '/planning',
      name: 'Planning',
      component: () => import('@/views/PlanningView.vue'),
      meta: { requiresAuth: true, title: 'วางแผนการซื้อวัตถุดิบ' },
    },
    {
      path: '/combos',
      name: 'Combos',
      component: () => import('@/views/CombosView.vue'),
      meta: { requiresAuth: true, title: 'ชุดโปรโมชัน' },
    },
    {
      path: '/sales',
      name: 'Sales',
      component: () => import('@/views/SalesView.vue'),
      meta: { requiresAuth: true, title: 'ยอดขายจริง vs เป้า' },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true, title: 'ตั้งค่าร้าน' },
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

router.beforeEach(async (to, _from, next) => {
  const { isAuthenticated, isPasswordRecovery, loading } = useAuth()

  if (loading.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(loading, (value) => {
        if (!value) {
          stop()
          resolve()
        }
      })
    })
  }

  if (isPasswordRecovery.value && isAuthenticated.value && to.name !== 'ResetPassword') {
    next({ name: 'ResetPassword' })
    return
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/dashboard')
  } else {
    next()
  }
})

router.afterEach((to) => {
  setDocumentTitle(to.meta.title)
})

export default router
