/**
 * 认证状态管理
 * SPEC: SPEC-AUTH-001, SPEC-AUTH-002, SPEC-AUTH-003, SPEC-AUTH-004
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'
import type { User, AuthResponse } from '@/types/models'

const STORAGE_KEY_TOKEN = 'auth:token'
const STORAGE_KEY_REFRESH_TOKEN = 'auth:refreshToken'
const STORAGE_KEY_USER = 'auth:user'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const currentUser = computed(() => user.value)

  /**
   * 初始化认证状态（从本地存储恢复）
   */
  function initAuth(): void {
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)
    const storedRefreshToken = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)
    const storedUser = localStorage.getItem(STORAGE_KEY_USER)

    if (storedToken && storedRefreshToken && storedUser) {
      token.value = storedToken
      refreshToken.value = storedRefreshToken
      user.value = JSON.parse(storedUser)
    }
  }

  /**
   * 用户注册
   * SPEC-AUTH-001
   */
  async function register(
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        username,
        email,
        password,
      })

      if (response.data) {
        const { token: newToken, refreshToken: newRefreshToken, user: newUser } = response.data

        // 保存认证信息
        token.value = newToken
        refreshToken.value = newRefreshToken
        user.value = newUser

        // 持久化到本地存储
        localStorage.setItem(STORAGE_KEY_TOKEN, newToken)
        localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, newRefreshToken)
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 用户登录
   * SPEC-AUTH-002
   */
  async function login(username: string, password: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        username,
        password,
      })

      if (response.data) {
        const { token: newToken, refreshToken: newRefreshToken, user: newUser } = response.data

        // 保存认证信息
        token.value = newToken
        refreshToken.value = newRefreshToken
        user.value = newUser

        // 持久化到本地存储
        localStorage.setItem(STORAGE_KEY_TOKEN, newToken)
        localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, newRefreshToken)
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 用户登出
   * SPEC-AUTH-003
   */
  async function logout(): Promise<void> {
    isLoading.value = true

    try {
      // 调用服务端登出接口，将 token 加入黑名单
      if (token.value) {
        await apiClient.post('/auth/logout')
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // 无论是否成功，都清除本地认证信息
      user.value = null
      token.value = null
      refreshToken.value = null
      error.value = null

      localStorage.removeItem(STORAGE_KEY_TOKEN)
      localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN)
      localStorage.removeItem(STORAGE_KEY_USER)

      isLoading.value = false
    }
  }

  /**
   * 刷新 Token
   * SPEC-AUTH-004
   */
  async function refreshTokenFn(): Promise<void> {
    if (!refreshToken.value) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await apiClient.post<{ token: string }>(
        '/auth/refresh',
        {
          refreshToken: refreshToken.value,
        }
      )

      if (response.data) {
        token.value = response.data.token
        localStorage.setItem(STORAGE_KEY_TOKEN, response.data.token)
      }
    } catch (err) {
      // Token 刷新失败，清除认证信息
      await logout()
      throw err
    }
  }

  /**
   * 更新用户信息
   */
  function updateUser(userData: User) {
    user.value = { ...user.value, ...userData }
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user.value))
  }

  return {
    // State
    user,
    token,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    currentUser,

    // Actions
    initAuth,
    register,
    login,
    logout,
    refreshToken: refreshTokenFn,
    updateUser,
  }
})

