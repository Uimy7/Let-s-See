<template>
  <div class="feed-layout">
    <!-- Top Navigation Bar -->
    <header class="nav-bar">
      <div class="nav-left">
        <div class="logo">News</div>
      </div>
      <div class="nav-center">
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'recommended' }"
          @click="switchTab('recommended')"
        >
          推荐
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'following' }"
          @click="switchTab('following')"
        >
          关注
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'hot' }"
          @click="switchTab('hot')"
        >
          热榜
        </div>
      </div>
      <div class="nav-right">
        <button class="icon-btn mobile-search-btn">🔍</button>
        
        <div class="search-box">
          <input type="text" placeholder="搜索你感兴趣的内容..." />
          <button>🔍</button>
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
        <!-- Pull Refresh Indicator -->
        <div 
          class="pull-indicator" 
          :style="{ height: `${pullDistance}px`, opacity: pullDistance > 0 ? 1 : 0 }"
        >
          <div v-if="isRefreshing" class="spinner small"></div>
          <span v-else>{{ pullDistance > 50 ? '释放刷新' : '下拉刷新' }}</span>
        </div>

        <div class="masonry-grid">
          <div
            v-for="item in articles"
            :key="item.id"
            class="video-card"
            @click="goToArticle(item.id)"
          >
            <div class="card-cover" :style="getImageStyle(item)">
              <img 
                v-if="item.lastImageUrl" 
                :src="item.lastImageUrl" 
                :alt="item.title"
                loading="lazy"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import type { FeedItem } from '@/types/models'
import FollowButton from '@/components/FollowButton.vue'

import { useAuthStore } from '@/stores/auth'
import ContentDetail from '@/components/ContentDetail.vue'
import MessageNotification from '@/components/MessageNotification.vue'
import MobileTabbar from '@/components/MobileTabbar.vue'

const router = useRouter()
const authStore = useAuthStore()

const articles = ref<FeedItem[]>([])
const isLoading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const activeTab = ref<'recommended' | 'following' | 'hot' | 'friends' | 'liked'>('recommended')
const sidebarTab = ref<'home' | 'friends' | 'liked'>('home')
const scrollContainer = ref<HTMLElement | null>(null)
const selectedArticleId = ref<string | null>(null)

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

// Pull to Refresh
const isPulling = ref(false)
const pullDistance = ref(0)
const isRefreshing = ref(false)
const startY = ref(0)

const handleTouchStart = (e: TouchEvent) => {
  const scrollTop = scrollContainer.value?.scrollTop || 0
  if (scrollTop === 0) {
    startY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value) return
  const scrollTop = scrollContainer.value?.scrollTop || 0
  if (scrollTop > 0) {
    isPulling.value = false
    return
  }
  
  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value
  
  if (diff > 0) {
    // Add resistance
    pullDistance.value = Math.min(diff * 0.5, 80)
    if (diff > 10 && e.cancelable) {
      e.preventDefault() // Prevent browser refresh only if cancelable
    }
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  
  if (pullDistance.value > 50) {
    isRefreshing.value = true
    pullDistance.value = 50 // Hold position
    await loadFeed(true) // Force reload
    setTimeout(() => {
      isRefreshing.value = false
      pullDistance.value = 0
    }, 500)
  } else {
    pullDistance.value = 0
  }
  isPulling.value = false
}

onMounted(() => {
  loadFeed()
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
  background-color: var(--bg-color);
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
}

.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.2s;
  color: var(--text-secondary);
  font-size: 12px;
}

.spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
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
  margin-top: 12px;
}

.card-title {
  font-size: 15px;
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
  }
  
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    padding: 0 16px;
    background: rgba(22, 24, 35, 0.98);
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
    border-radius: 4px;
    overflow: hidden;
    display: inline-block; /* Prevent break inside columns */
    break-inside: avoid;
    flex-direction: column;
  }
  
  .card-cover {
    border-radius: 0;
    padding-bottom: 0; /* Fix: Reset padding-bottom to remove black gap */
    height: auto;
    min-height: auto; /* Allow it to be smaller if image is small */
    background-color: var(--bg-secondary);
  }

  .card-cover img {
    position: static; /* Allow image to dictate height */
    width: 100%;
    height: auto;
    display: block;
  }
  
  .card-info {
    padding: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .card-title {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 8px;
    font-weight: 600; /* Bolder title */
    color: #f1f1f1; /* Brighter text for dark mode */
    letter-spacing: 0.5px;
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
    font-size: 14px;
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
</style>
