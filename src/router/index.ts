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
  ],
})

router.beforeEach(async (to, _from, next) => {
  const { isAuthenticated, loading } = useAuth()

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

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
