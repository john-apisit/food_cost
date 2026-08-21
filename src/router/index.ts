import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/', redirect: '/dashboard' },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/ingredients',
      name: 'Ingredients',
      component: () => import('@/views/IngredientsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/packaging',
      name: 'Packaging',
      component: () => import('@/views/PackagingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/menu',
      name: 'Menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/menu/new',
      name: 'MenuNew',
      component: () => import('@/views/MenuFormView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/menu/:id/edit',
      name: 'MenuEdit',
      component: () => import('@/views/MenuFormView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/menu/:id',
      name: 'MenuDetail',
      component: () => import('@/views/MenuDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/comparison',
      name: 'Comparison',
      component: () => import('@/views/ComparisonView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/planning',
      name: 'Planning',
      component: () => import('@/views/PlanningView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/combos',
      name: 'Combos',
      component: () => import('@/views/CombosView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/sales',
      name: 'Sales',
      component: () => import('@/views/SalesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true },
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

export default router
