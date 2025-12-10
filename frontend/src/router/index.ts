/**
 * 前端路由配置
 */

import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/Register.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/feed',
    name: 'Feed',
    component: () => import('@/pages/Feed.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('@/pages/Editor.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/editor/:draftId',
    name: 'EditorWithDraft',
    component: () => import('@/pages/Editor.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/messages',
    name: 'MessageList',
    component: () => import('@/pages/MessageList.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/article/:id',
    name: 'ArticleDetail',
    component: () => import('@/pages/ArticleDetail.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/profile/:id',
    name: 'UserProfile',
    component: () => import('@/pages/Profile.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/Profile.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/Search.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/feed',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 全局导航守卫
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 确保认证状态已初始化
  if (!authStore.token && !authStore.user) {
    authStore.initAuth()
  }

  // 检查是否需要认证
  const requiresAuth = to.meta.requiresAuth
  const isAuthenticated = authStore.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    // 需要认证但未登录，重定向到登录页
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated) {
    // 已登录但访问认证页面，重定向到 Feed
    next({ name: 'Feed' })
  } else {
    next()
  }
})

/**
 * 路由预加载
 * 在空闲时间预加载可能访问的页面组件
 */
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // 预加载 Feed 页面（最常访问）
    import('@/pages/Feed.vue').catch(() => {})
    
    // 预加载其他常用页面
    setTimeout(() => {
      import('@/pages/Profile.vue').catch(() => {})
      import('@/pages/Editor.vue').catch(() => {})
    }, 1000)
  })
}

export default router

