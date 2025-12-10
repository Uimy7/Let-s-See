<template>
  <div class="feed-layout">
    <!-- Top Navigation Bar -->
    <header class="nav-bar">
      <div class="nav-left">
        <!-- <div class="logo">News</div> -->
      </div>
      <div class="nav-center">
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'recommended' }"
          @click="switchTab('recommended')"
        >
          推荐
        </div>
      </div>
      <div class="nav-right">
        <button class="icon-btn mobile-search-btn">
          <img src="@/assets/icons/search.png" alt="搜索" style="width: 20px; height: 20px;">
        </button>
        
        <div class="search-box">
          <input type="text" placeholder="搜索你感兴趣的内容..." />
          <button>
            <img src="@/assets/icons/search.png" alt="搜索" style="width: 20px; height: 20px;">
          </button>
        </div>
        <MessageNotification />
        <router-link to="/editor" class="upload-btn">
          <span>+ 发布</span>
        </router-link>
        <div class="user-profile" @click="router.push('/profile')">
          <div class="avatar-placeholder" :style="{backgroundImage:`url(${authStore.currentUser?.avatar})`,backgroundPosition: 'center center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat'}"></div>
        </div>
      </div>
    </header>

    <div class="main-content">
      <!-- Left Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-menu">
          <div 
            class="menu-item" 
            :class="{ active: sidebarTab === 'home' }"
            @click="switchSidebarTab('home')"
          >
            <span class="icon">🏠</span>
            <span class="label">首页</span>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: sidebarTab === 'friends' }"
            @click="switchSidebarTab('friends')"
          >
            <span class="icon">👥</span>
            <span class="label">朋友</span>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: sidebarTab === 'liked' }"
            @click="switchSidebarTab('liked')"
          >
            <span class="icon">❤️</span>
            <span class="label">我的喜欢</span>
          </div>
        </div>
      </aside>

      <!-- Feed Stream -->
      <main 
        class="feed-stream" 
        ref="scrollContainer" 
        @scroll="handleScroll"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <!-- 下拉刷新指示器 -->
        <div 
          class="pull-refresh-indicator" 
          :class="{ 
            visible: pullDistance > 0 || isRefreshing,
            loading: isRefreshing,
            ready: pullDistance >= pullThreshold,
            releasing: !canPull && pullDistance > 0
          }"
        >
          <div v-if="!isRefreshing" class="refresh-icon">
            <span v-if="pullDistance < pullThreshold">↓</span>
            <span v-else>↻</span>
          </div>
          <div v-else class="refresh-spinner"></div>
          <span class="refresh-text">
            {{ isRefreshing ? '正在刷新...' : (pullDistance >= pullThreshold ? '释放以刷新' : '下拉刷新') }}
          </span>
        </div>

        <div 
          class="masonry-grid" 
          :style="{ 
            transform: `translateY(${pullDistance > 0 || isRefreshing ? Math.min(pullDistance, isRefreshing ? pullThreshold : pullThreshold + 20) : 0}px)`,
            transition: (isRefreshing || (!canPull && pullDistance > 0)) ? 'transform 0.3s ease-out' : 'none'
          }"
        >
          <!-- 骨架屏 -->
          <div
            v-if="isLoading && articles.length === 0"
            v-for="n in 6"
            :key="`skeleton-${n}`"
            class="video-card skeleton-card"
          >
            <div class="card-cover skeleton-cover">
              <div class="skeleton-image"></div>
            </div>
            <div class="card-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-title" style="width: 70%; margin-top: 8px;"></div>
              <div class="card-footer" style="margin-top: 12px;">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-text" style="width: 60px; margin-left: 8px;"></div>
              </div>
            </div>
          </div>
          
          <!-- 实际内容 -->
          <div
            v-for="(item, index) in articles"
            :key="item.id"
            class="video-card"
            @click="goToArticle(item.id)"
          >
            <div class="card-cover" :style="getImageStyle(item)">
              <img 
                v-if="item.lastImageUrl" 
                :src="item.lastImageUrl" 
                :alt="item.title"
                :loading="index < 4 ? 'eager' : 'lazy'"
                :fetchpriority="index < 2 ? 'high' : 'auto'"
                :style="getImageImgStyle(item)"
              />
              <div v-else class="no-image-placeholder">
                <span>{{ item.title.charAt(0) }}</span>
              </div>
              <div class="card-gradient"></div>
              <div class="card-stats">
                <span>👁️ {{ item.viewCount }}</span>
              </div>
              <div 
                class="heart-button"
                :class="{ liked: item.isLiked, animating: item.animating }"
                @click.stop="toggleLike(item)"
              >
                <span class="heart-icon" @click.stop="toggleLike(item)">{{ item.isLiked ? '❤️' : '🤍' }}</span>
              </div>
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ item.title }}</h3>
              <div class="card-footer">
                <div class="stats-left">
                  <div class="author-info-mini">
                    <div class="author-avatar" :style="{backgroundImage:`url(${item.author.avatar})`,backgroundPosition: 'center center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat'}"></div>
                    <span class="author-name">{{ item.author.username }}</span>
                  </div>
                </div>
                <div class="stats-right">
                  <span class="like-count">🤍 {{ item.isLiked ? '1' : '0' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-if="!hasMore && !isLoading" class="end-state">
          <span>- 暂时没有更多内容了 -</span>
        </div>
      
        <!-- 详细内容模态框 -->
        <ContentDetail 
          v-if="selectedArticleId" 
          :article-id="selectedArticleId"
          :visible="!!selectedArticleId"
          @close="handleCloseDetail"
        /> 

      </main>
    </div>
    
    <MobileTabbar />
  </div>
 
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiClient } from '@/utils/api'
import type { FeedItem } from '@/types/models'

import { useAuthStore } from '@/stores/auth'
import ContentDetail from '@/components/ContentDetail.vue'
import MessageNotification from '@/components/MessageNotification.vue'
import MobileTabbar from '@/components/MobileTabbar.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const articles = ref<FeedItem[]>([])
const isLoading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const activeTab = ref<'recommended' | 'following' | 'video' | 'hot' | 'friends' | 'liked'>('recommended')
const sidebarTab = ref<'home' | 'friends' | 'liked'>('home')
const scrollContainer = ref<HTMLElement | null>(null)
const selectedArticleId = ref<string | null>(null)

// 下拉刷新相关
const isRefreshing = ref(false)
const pullDistance = ref(0)
const pullThreshold = 60 // 触发刷新的阈值
const startY = ref(0)
const canPull = ref(false)
const isMobile = ref(window.innerWidth <= 768)

// Helper to calculate image styles
const getImageStyle = (item: FeedItem) => {
  if (item.lastImageWidth && item.lastImageHeight) {
    // Calculate aspect ratio, but limit max height logic via CSS/style if needed
    // Here we just set a min height or let it be flexible
    return {} 
  }
  return {}
}

const getImageImgStyle = (item: FeedItem) => {
  if (item.lastImageWidth && item.lastImageHeight) {
    const aspectRatio = item.lastImageHeight / item.lastImageWidth
    // If image is too tall (e.g. > 1.5 aspect ratio), limit it
    // Assuming width is ~100% of card (~170px on mobile)
    // Max height constraint: let's say 280px or aspect ratio 4:5
    
    // For true masonry, we let it flow, but cap extreme heights
    const maxAspectRatio = 1.6 // e.g. 5:8
    
    if (aspectRatio > maxAspectRatio) {
      return {
        height: '260px', // Max fixed height
        objectFit: 'cover' as const
      }
    }
  }
  return {}
}

// 更新移动端状态
const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 监听路由查询参数变化
watch(() => route.query.tab, (newTab) => {
  if (newTab === 'following') {
    if (activeTab.value !== 'following') {
      activeTab.value = 'following'
      currentPage.value = 1
      articles.value = []
      hasMore.value = true
      loadFeed()
    }
  } else if (!newTab && activeTab.value === 'following') {
    // 如果查询参数被清除，切换回推荐
    activeTab.value = 'recommended'
    currentPage.value = 1
    articles.value = []
    hasMore.value = true
    loadFeed()
  }
})

onMounted(() => {
  // 检查路由参数，如果有tab参数，切换到对应的tab
  const tabParam = route.query.tab as string
  if (tabParam === 'following') {
    activeTab.value = 'following'
  }
  loadFeed()
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})

const switchSidebarTab = async (tab: 'home' | 'friends' | 'liked') => {
  if (sidebarTab.value === tab) {
    // 如果已经是当前 tab，不需要切换
    return
  }
  
  sidebarTab.value = tab
  
  // 首页切换到推荐 tab，朋友切换到朋友内容，喜欢切换到喜欢内容
  if (tab === 'home') {
    activeTab.value = 'recommended'
  } else if (tab === 'friends') {
    activeTab.value = 'friends' as any
  } else if (tab === 'liked') {
    activeTab.value = 'liked' as any
  }
  
  currentPage.value = 1
  articles.value = []
  hasMore.value = true
  await loadFeed()
}

const switchTab = async (tab: 'recommended' | 'following' | 'hot') => {
  if (tab === 'hot') {
    // 热榜功能暂未实现
    return
  }
  
  if (activeTab.value === tab) {
    // 如果已经是当前 tab，不需要切换
    return
  }
  
  activeTab.value = tab
  // 更新路由查询参数
  if (tab === 'following') {
    router.push({ path: '/feed', query: { tab: 'following' } })
  } else {
    router.push({ path: '/feed', query: {} })
  }
  currentPage.value = 1
  articles.value = []
  hasMore.value = true
  await loadFeed()
}

const loadFeed = async (refresh = false) => {
  if (isLoading.value && !refresh) return
  isLoading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }
  
  try {
    const params: any = { 
      page: 1, 
      limit: 20 
    }
    
    // Add type parameter for following/friends/liked feed
    if (activeTab.value === 'following') {
      params.type = 'following'
    } else if (activeTab.value === 'friends') {
      params.type = 'friends'
    } else if (activeTab.value === 'liked') {
      params.type = 'liked'
    }
    
    const response = await apiClient.get('/feed', { params })

    if (response.data) {
      const feedData = response.data as any
      const items = mapFeedItems(feedData.items)
      if (refresh) {
        articles.value = items
      } else {
        articles.value = items // Original logic was replacing on page 1, push on loadMore
      }
      hasMore.value = feedData.page < feedData.totalPages
    }
  } catch (error) {
    console.error('Feed error:', error)
    if ((activeTab.value === 'following' || activeTab.value === 'friends' || activeTab.value === 'liked') && !authStore.isAuthenticated) {
      // If not authenticated and trying to access following/friends/liked feed, redirect to login
      router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (!hasMore.value || isLoading.value) return
  isLoading.value = true
  const nextPage = currentPage.value + 1

  try {
    const params: any = {
      page: nextPage,
      limit: 20
    }
    
    // Add type parameter for following/friends/liked feed
    if (activeTab.value === 'following') {
      params.type = 'following'
    } else if (activeTab.value === 'friends') {
      params.type = 'friends'
    } else if (activeTab.value === 'liked') {
      params.type = 'liked'
    }
    
    const response = await apiClient.get('/feed', { params })

    if (response.data) {
      const feedData = response.data as any
      const newItems = mapFeedItems(feedData.items)
      articles.value.push(...newItems)
      hasMore.value = feedData.page < feedData.totalPages
      currentPage.value = nextPage
    }
  } catch (error) {
    console.error('Load more error:', error)
  } finally {
    isLoading.value = false
  }
}

const mapFeedItems = (items: any[]): FeedItem[] => {
  return items.map(item => ({
    id: item._id,
    title: item.title,
    summary: item.summary,
    lastImageUrl: item.images?.[0]?.url,
    lastImageWidth: item.images?.[0]?.width,
    lastImageHeight: item.images?.[0]?.height,
    author: {
      id: item.authorId._id,
      username: item.authorId.username,
      avatar: item.authorId.avatar,
      // Pass follow status if available from backend
      followStatus: item.authorId.followStatus 
    },
    viewCount: item.viewCount,
    createdAt: item.createdAt,
    isLiked: item.isLiked || false,
    animating: false
  }))
}

const handleCloseDetail = () => {
  selectedArticleId.value = null
  document.body.style.overflow = ''
}

const toggleLike = async (item: FeedItem & { isLiked?: boolean; animating?: boolean }) => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  // Prevent double click
  if (item.animating) return

  const wasLiked = item.isLiked || false
  const newLikedState = !wasLiked

  // Optimistic update
  item.isLiked = newLikedState
  item.animating = true

  try {
    if (newLikedState) {
      await apiClient.post(`/likes/${item.id}`)
    } else {
      await apiClient.delete(`/likes/${item.id}`)
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      item.animating = false
    }, 600)
  } catch (error) {
    // Revert on error
    item.isLiked = wasLiked
    item.animating = false
    console.error('Like error:', error)
  }
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 200) {
    loadMore()
  }
}

const goToArticle = (id: string) => {
  selectedArticleId.value = id
  // 防止背景滚动
  document.body.style.overflow = 'hidden'
}

// 下拉刷新事件处理
const handleTouchStart = (e: TouchEvent) => {
  if (!scrollContainer.value) return
  
  // 获取正确的滚动容器（移动端可能是 main-content）
  const isMobile = window.innerWidth <= 768
  const scrollElement = isMobile 
    ? (scrollContainer.value.closest('.main-content') as HTMLElement || scrollContainer.value)
    : scrollContainer.value
  
  // 只有当滚动到顶部时才允许下拉刷新
  const scrollTop = scrollElement.scrollTop
  if (scrollTop === 0 && !isRefreshing.value) {
    canPull.value = true
    startY.value = e.touches[0].clientY
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!canPull.value || isRefreshing.value || !scrollContainer.value) return
  
  // 获取正确的滚动容器（移动端可能是 main-content）
  const isMobile = window.innerWidth <= 768
  const scrollElement = isMobile 
    ? (scrollContainer.value.closest('.main-content') as HTMLElement || scrollContainer.value)
    : scrollContainer.value
  
  const currentY = e.touches[0].clientY
  const distance = currentY - startY.value
  
  // 只有向下拉时才处理
  if (distance > 0) {
    // 检查是否仍然在顶部
    const scrollTop = scrollElement.scrollTop
    if (scrollTop === 0) {
      // 添加阻尼效果，拉得越远阻力越大
      pullDistance.value = distance * 0.5
      
      // 如果拉得太远，阻止默认行为以避免页面滚动
      if (distance > 10) {
        e.preventDefault()
      }
    } else {
      // 如果不在顶部了，重置
      canPull.value = false
      pullDistance.value = 0
    }
  }
}

const handleTouchEnd = async () => {
  if (!canPull.value || isRefreshing.value) return
  
  // 如果拉动距离超过阈值，触发刷新
  if (pullDistance.value >= pullThreshold) {
    isRefreshing.value = true
    // 保持在刷新位置
    pullDistance.value = pullThreshold
    
    try {
      await loadFeed(true)
      // 刷新成功后等待一小段时间再隐藏指示器
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      isRefreshing.value = false
      // 平滑收回指示器
      await new Promise(resolve => {
        pullDistance.value = 0
        setTimeout(resolve, 300)
      })
    }
  } else {
    // 没有达到阈值，直接收回
    pullDistance.value = 0
  }
  
  // 重置状态
  canPull.value = false
}
</script>

<style scoped>
.feed-layout {
  width: 100%;
  height: 100vh;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
}

/* Nav Bar */
.nav-bar {
  height: 60px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--nav-bg);
  backdrop-filter: blur(10px);
  z-index: 100;
}

.logo {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(to right, #fe2c55, #ff1c74);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-center {
  display: flex;
  gap: 30px;
}

.nav-tab {
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  font-weight: 500;
  transition: color 0.2s;
  padding: 8px 0;
  user-select: none;
}

.nav-tab:hover {
  color: var(--text-primary);
}

.nav-tab.active {
  color: var(--text-primary);
  font-weight: 600;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: -21px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--primary-color);
}

  .nav-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .mobile-search-btn {
    display: none;
  }
  
  .search-box {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
}

.search-box input {
  background: transparent;
  border: none;
  color: white;
  width: 200px;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
}

.upload-btn {
  background: rgba(255, 255, 255, 0.08);
  padding: 8px 16px;
  border-radius: 2px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  transition: background 0.2s;
}

.upload-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  background-color: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
}

/* Main Layout */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  padding: 16px 8px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.2s, color 0.2s;
  margin-bottom: 4px;
  user-select: none;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.menu-item.active {
  color: var(--primary-color);
  background: rgba(254, 44, 85, 0.1);
  font-weight: 500;
}

.menu-item .icon {
  margin-right: 12px;
  font-size: 20px;
}

.menu-item .label {
  font-size: 16px;
  font-weight: 500;
}

/* Feed Stream */
.feed-stream {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  /* Smooth scrolling */
  -webkit-overflow-scrolling: touch;
  position: relative;
}

/* 下拉刷新指示器 */
.pull-refresh-indicator {
  position: absolute;
  top: -60px;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  transition: opacity 0.2s ease-out;
  opacity: 0;
  pointer-events: none;
  z-index: 10;
}

.pull-refresh-indicator.visible {
  opacity: 1;
}

.pull-refresh-indicator.loading,
.pull-refresh-indicator.releasing {
  transition: transform 0.3s ease-out, opacity 0.2s ease-out;
}

.pull-refresh-indicator.ready .refresh-icon {
  color: var(--primary-color);
}

.pull-refresh-indicator.ready .refresh-text {
  color: var(--primary-color);
}

.refresh-icon {
  font-size: 20px;
  transition: transform 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pull-refresh-indicator.ready .refresh-icon {
  animation: rotateIcon 0.5s ease-in-out;
}

@keyframes rotateIcon {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(180deg);
  }
}

.refresh-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(254, 44, 85, 0.2);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
}

.refresh-text {
  font-size: 13px;
  font-weight: 500;
}

.masonry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

/* Video Card */
.video-card {
  position: relative;
  cursor: pointer;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.card-cover {
  position: relative;
  width: 100%;
  padding-bottom: 133%; /* 3:4 Aspect Ratio */
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.card-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.3s;
}

.video-card:hover .card-cover img {
  transform: scale(1.05);
}

.no-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: var(--text-tertiary);
  background-color: #333;
}

.card-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
  pointer-events: none;
}

.card-stats {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.heart-button {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background: rgba(0, 0, 0, 0.5); */
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.heart-button:hover {
  /* background: rgba(0, 0, 0, 0.7); */
  transform: scale(1.1);
}

/* .heart-button.liked {
  background: rgba(254, 44, 85, 0.8);
} */

/* .heart-button.liked:hover {
  background: rgba(254, 44, 85, 1);
} */

.heart-icon {
  font-size: 18px;
  display: block;
  transition: transform 0.3s ease;
}

.heart-button.animating .heart-icon {
  animation: heartBounce 0.6s ease;
}

@keyframes heartBounce {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.3);
  }
  50% {
    transform: scale(0.9);
  }
  75% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.card-info {
  margin-top: 0;
  background-color: var(--bg-secondary);
  padding: 12px;
}

.card-title {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 500;
}

.card-author {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #666;
  margin-right: 6px;
}

.mini-follow-btn {
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  transform: scale(0.9);
}

.post-time {
  margin-left: auto;
  color: var(--text-tertiary);
}

/* Loading States */
.loading-state,
.end-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-tertiary);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .feed-layout {
    height: 100vh;
    padding-bottom: 50px; /* Bottom Tabbar */
  }

  .main-content {
    display: block; /* Disable flex to handle scrolling better on mobile */
    height: 100%;
    overflow-y: auto;
  }
  
  .sidebar {
    display: none;
  }

  .feed-stream {
    padding: 0;
    height: auto; /* Let content flow */
    overflow: visible;
    position: relative;
  }
  
  /* 移动端下拉刷新指示器 */
  .pull-refresh-indicator {
    position: fixed;
    top: 50px; /* 顶部导航栏高度 */
    left: 0;
    right: 0;
    height: 60px;
    background: var(--bg-color);
    z-index: 99;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pull-refresh-indicator.visible {
    opacity: 1;
  }
  
  .pull-refresh-indicator.loading {
    opacity: 1;
  }
  
  /* 确保 masonry-grid 在移动端也能正确下拉 */
  .masonry-grid {
    will-change: transform;
  }
  
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    padding: 0 16px;
    background: var(--nav-bg);
    backdrop-filter: blur(10px);
    border-bottom: none;
    justify-content: center;
  }
  
  .nav-left {
    position: absolute;
    left: 16px;
  }
  
  .nav-center {
    gap: 20px;
  }
  
  .nav-tab {
    font-size: 15px;
    padding: 13px 0;
  }
  
  .nav-tab.active::after {
    bottom: 0;
  }
  
  .nav-right {
    position: absolute;
    right: 16px;
  }

  .mobile-search-btn {
    display: block;
    font-size: 22px;
    color: var(--text-primary);
    background: transparent;
    border: none;
    padding: 4px;
  }
  
  /* Hide PC elements explicitly using classes to avoid !important wars */
  .search-box, 
  .upload-btn,
  .user-profile,
  .message-notification { /* Hide notification bell on mobile since we have a tab */
    display: none !important;
  }
  
  /* Masonry / Double Column Layout */
  .masonry-grid {
    display: block;
    column-count: 2;
    column-gap: 8px;
    padding: 58px 8px 20px 8px; /* Header offset + gap */
  }
  
  .video-card {
    width: 100%;
    background: var(--bg-secondary);
    margin-bottom: 8px;
    border-radius: 8px;
    overflow: hidden;
    display: inline-block; /* Prevent break inside columns */
    break-inside: avoid;
    flex-direction: column;
  }
  
  .card-cover {
    border-radius: 0;
    padding-bottom: 133%; /* 保持固定比例，确保图片区域占满上半部分 */
    height: 0;
    background-color: var(--bg-secondary);
  }

  .card-cover img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  
  .card-info {
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: var(--bg-secondary);
  }
  
  .card-title {
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: 0.2px;
  }
  
  .card-author {
    font-size: 11px;
  }
  
  .author-avatar {
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
  

  .card-author,
  .heart-button,
  .card-gradient,
  .card-stats {
    display: none; /* Hide PC elements explicitly */
  }
  
  /* Mobile Card Footer (Author + Likes) */
  .card-footer {
    display: flex;
    margin-top: 8px;
    align-items: center;
    justify-content: space-between;
  }
  
  .stats-left {
    flex: 1;
    min-width: 0;
  }
  
  .author-info-mini {
    display: flex;
    align-items: center;
  }
  
  .author-avatar {
    width: 18px;
    height: 18px;
    margin-right: 6px;
    border-radius: 50%;
  }

  .author-name {
    font-size: 11px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 80px;
  }
  
  .stats-right {
    font-size: 12px;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
  }
  
  .like-count {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
  }

  .card-title {
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: 0.2px;
    /* Ensure max 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* 骨架屏样式 */
.skeleton-card {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-cover {
  position: relative;
  background: var(--bg-secondary);
}

.skeleton-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

.skeleton-title {
  height: 14px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.5s infinite;
}

.skeleton-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

.skeleton-text {
  height: 12px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
