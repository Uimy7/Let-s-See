<template>
  <div class="search-page">
    <!-- 顶部搜索栏 -->
    <div class="search-header">
      <button class="back-btn" @click="goBack">
        <span>←</span>
      </button>
      <div class="search-input-wrapper">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="搜索你感兴趣的内容..."
          @keyup.enter="handleSearch"
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">×</button>
      </div>
      <button class="search-btn" @click="handleSearch">搜索</button>
    </div>

    <!-- 搜索结果 -->
    <div v-if="showResults" class="search-results">
      <div class="results-header">
        <h3>搜索结果</h3>
        <span class="result-count">共 {{ totalResults }} 条结果</span>
      </div>
      
      <div v-if="isSearching" class="loading-state">
        <div class="spinner"></div>
        <span>搜索中...</span>
      </div>

      <div v-else-if="searchResults.length === 0" class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>没有找到相关内容</p>
        <p class="empty-hint">试试其他关键词吧</p>
      </div>

      <div v-else class="results-list">
        <div
          v-for="article in searchResults"
          :key="article.id"
          class="result-item"
          @click="goToArticle(article.id)"
        >
          <div v-if="article.lastImageUrl" class="result-image">
            <img :src="article.lastImageUrl" :alt="article.title" />
          </div>
          <div class="result-content">
            <h4 class="result-title">{{ article.title }}</h4>
            <p class="result-summary">{{ article.summary }}</p>
            <div class="result-meta">
              <span class="author">{{ article.author.username }}</span>
              <span class="view-count">👁️ {{ article.viewCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 默认内容（历史记录 + 推荐 + 热榜） -->
    <div v-else class="search-default">
      <!-- 历史记录 -->
      <div v-if="searchHistory.length > 0" class="history-section">
        <div class="section-header">
          <h3>历史记录</h3>
          <button class="clear-history-btn" @click="clearHistory">
            <img src="@/assets/icons/publish.png" alt="清空" style="width: 16px; height: 16px; transform: rotate(45deg);" />
          </button>
        </div>
        <div class="history-tags">
          <div
            v-for="(keyword, index) in searchHistory"
            :key="index"
            class="history-tag"
            @click="searchFromHistory(keyword)"
          >
            {{ keyword }}
          </div>
        </div>
      </div>

      <!-- 猜你想搜 -->
      <div class="recommend-section">
        <div class="section-header">
          <h3>猜你想搜</h3>
        </div>
        <div v-if="isLoadingRecommend" class="loading-state">
          <div class="spinner-small"></div>
        </div>
        <div v-else class="recommend-tags">
          <div
            v-for="keyword in recommendations"
            :key="keyword"
            class="recommend-tag"
            @click="searchKeyword(keyword)"
          >
            {{ keyword }}
          </div>
        </div>
      </div>

      <!-- 热榜 -->
      <div class="hot-section">
        <div class="section-header">
          <h3>热榜</h3>
        </div>
        <div v-if="isLoadingHot" class="loading-state">
          <div class="spinner-small"></div>
        </div>
        <div v-else class="hot-list">
          <div
            v-for="(article, index) in hotArticles"
            :key="article.id"
            class="hot-item"
            @click="goToArticle(article.id)"
          >
            <div class="hot-rank" :class="{ top: index < 3 }">{{ index + 1 }}</div>
            <div class="hot-content">
              <h4 class="hot-title">{{ article.title }}</h4>
              <div class="hot-meta">
                <span class="hot-author">{{ article.author.username }}</span>
              </div>
            </div>
            <div v-if="article.lastImageUrl" class="hot-image">
              <img :src="article.lastImageUrl" :alt="article.title" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文章详情模态框 -->
    <ContentDetail 
      v-if="selectedArticleId" 
      :article-id="selectedArticleId"
      :visible="!!selectedArticleId"
      @close="handleCloseDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/utils/api'
import type { FeedItem } from '@/types/models'
import ContentDetail from '@/components/ContentDetail.vue'

const router = useRouter()
const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const searchHistory = ref<string[]>([])
const recommendations = ref<string[]>([])
const hotArticles = ref<FeedItem[]>([])
const searchResults = ref<FeedItem[]>([])
const showResults = ref(false)
const isSearching = ref(false)
const isLoadingRecommend = ref(false)
const isLoadingHot = ref(false)
const totalResults = ref(0)
const selectedArticleId = ref<string | null>(null)

// 历史记录存储key
const SEARCH_HISTORY_KEY = 'search_history'
const MAX_HISTORY_ITEMS = 10

onMounted(async () => {
  // 自动聚焦搜索框
  await nextTick()
  searchInput.value?.focus()

  // 加载历史记录
  loadSearchHistory()

  // 加载推荐和热榜
  loadRecommendations()
  loadHotArticles()
})

// 加载历史记录
const loadSearchHistory = () => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (history) {
      searchHistory.value = JSON.parse(history)
    }
  } catch (error) {
    console.error('Failed to load search history:', error)
  }
}

// 保存历史记录
const saveSearchHistory = (keyword: string) => {
  if (!keyword.trim()) return

  // 移除重复项
  const newHistory = [keyword, ...searchHistory.value.filter(item => item !== keyword)]
  
  // 限制数量
  searchHistory.value = newHistory.slice(0, MAX_HISTORY_ITEMS)

  // 保存到本地存储
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory.value))
  } catch (error) {
    console.error('Failed to save search history:', error)
  }
}

// 清空历史记录
const clearHistory = () => {
  searchHistory.value = []
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear search history:', error)
  }
}

// 从历史记录搜索
const searchFromHistory = (keyword: string) => {
  searchQuery.value = keyword
  handleSearch()
}

// 搜索关键词
const searchKeyword = (keyword: string) => {
  searchQuery.value = keyword
  handleSearch()
}

// 执行搜索
const handleSearch = async () => {
  const keyword = searchQuery.value.trim()
  if (!keyword) return

  // 保存到历史记录
  saveSearchHistory(keyword)

  isSearching.value = true
  showResults.value = true

  try {
    const response = await apiClient.get<{
      items: any[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>('/articles/search', {
      params: {
        keyword,
        page: 1,
        limit: 20
      }
    })

    if (response.data) {
      const { items, total } = response.data
      searchResults.value = mapFeedItems(items)
      totalResults.value = total || items.length
    }
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
    totalResults.value = 0
  } finally {
    isSearching.value = false
  }
}

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
  showResults.value = false
  searchResults.value = []
  searchInput.value?.focus()
}

// 加载推荐关键词
const loadRecommendations = async () => {
  isLoadingRecommend.value = true
  try {
    const response = await apiClient.get<{
      keywords: string[]
    }>('/articles/recommendations')
    if (response.data) {
      recommendations.value = response.data.keywords || []
    }
  } catch (error) {
    console.error('Failed to load recommendations:', error)
    // 使用默认推荐
    recommendations.value = ['旅游攻略', '美食推荐', '科技资讯', '生活日常', '学习笔记']
  } finally {
    isLoadingRecommend.value = false
  }
}

// 加载热榜
const loadHotArticles = async () => {
  isLoadingHot.value = true
  try {
    const response = await apiClient.get<{
      items: any[]
    }>('/articles/hot', {
      params: {
        limit: 10
      }
    })

    if (response.data) {
      hotArticles.value = mapFeedItems(response.data.items)
    }
  } catch (error) {
    console.error('Failed to load hot articles:', error)
    hotArticles.value = []
  } finally {
    isLoadingHot.value = false
  }
}

// 映射数据
const mapFeedItems = (items: any[]): FeedItem[] => {
  return items.map(item => ({
    id: item._id,
    title: item.title,
    summary: item.summary,
    lastImageUrl: item.images?.[0]?.url,
    lastImageWidth: item.images?.[0]?.width,
    lastImageHeight: item.images?.[0]?.height,
    author: {
      id: item.authorId._id || item.authorId,
      username: item.authorId.username || '未知用户',
      avatar: item.authorId.avatar
    },
    viewCount: item.viewCount || 0,
    createdAt: item.createdAt
  }))
}

// 打开文章详情
const goToArticle = (id: string) => {
  selectedArticleId.value = id
  // 防止背景滚动
  document.body.style.overflow = 'hidden'
}

// 关闭文章详情
const handleCloseDetail = () => {
  selectedArticleId.value = null
  document.body.style.overflow = ''
}

// 返回上一页
const goBack = () => {
  router.back()
}
</script>

<style scoped>
.search-page {
  width: 100%;
  height: 100vh;
  background-color: var(--bg-color);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* 顶部搜索栏 */
.search-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--nav-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.back-btn {
  font-size: 24px;
  color: var(--text-primary);
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 16px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: var(--primary-color);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-btn {
  position: absolute;
  right: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.search-btn {
  padding: 8px 16px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.search-btn:hover {
  background-color: #e5284b;
}

/* 搜索结果 */
.search-results {
  padding: 16px;
  flex: 1;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.results-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.result-image {
  flex-shrink: 0;
  width: 100px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.05);
}

.result-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.result-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 默认内容 */
.search-default {
  padding: 16px;
  flex: 1;
  padding-bottom: 60px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.hot-badge {
  font-size: 16px;
}

/* 历史记录 */
.history-section {
  margin-bottom: 32px;
}

.clear-history-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  transition: all 0.2s;
}

.clear-history-btn:hover {
  color: var(--text-primary);
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.history-tag:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: var(--primary-color);
}

/* 推荐 */
.recommend-section {
  margin-bottom: 32px;
}

.recommend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recommend-tag {
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.recommend-tag:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: var(--primary-color);
}

/* 热榜 */
.hot-section {
  margin-bottom: 32px;
}

.hot-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.hot-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.hot-rank {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.hot-rank.top {
  background: linear-gradient(135deg, #fe2c55, #ff6b6b);
  color: white;
}

.hot-content {
  flex: 1;
  min-width: 0;
}

.hot-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hot-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.hot-image {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.05);
}

.hot-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-tertiary);
  gap: 12px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 15px;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-quaternary);
}

/* 响应式 */
@media (max-width: 768px) {
  .search-page {
    padding-bottom: 70px;
  }
}
</style>

