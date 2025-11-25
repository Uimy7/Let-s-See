<template>
  <div class="message-list-page">
    <!-- Top Navigation -->
    <header class="nav-bar">
      <div class="nav-title">消息</div>
      <div class="nav-right">
        <button class="icon-btn">👤+</button>
      </div>
    </header>

    <!-- Conversations List -->
    <main class="main-content">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
      </div>
      
      <div v-else-if="conversations.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <p>暂无消息</p>
      </div>
      
      <div v-else class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.userId"
          class="conversation-item"
          @click="openMessageDialog(conv)"
        >
          <div class="avatar-wrapper">
            <div 
              class="avatar"
              :style="conv.avatar ? { backgroundImage: `url(${conv.avatar})` } : {}"
            >
              <span v-if="!conv.avatar" class="avatar-initial">
                {{ conv.username?.charAt(0).toUpperCase() || 'U' }}
              </span>
            </div>
            <span v-if="conv.unreadCount > 0" class="unread-badge">{{ conv.unreadCount }}</span>
          </div>
          
          <div class="info-wrapper">
            <div class="info-top">
              <span class="username">{{ conv.username }}</span>
              <span v-if="conv.lastMessage" class="time">
                {{ formatDate(conv.lastMessage.createdAt) }}
              </span>
            </div>
            <div class="info-bottom">
              <span class="preview-text">
                {{ conv.lastMessage?.content || '暂无消息' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Message Dialog (Reuse existing component) -->
    <MessageDialog
      v-if="selectedUser"
      :visible="showMessageDialog"
      :target-user-id="selectedUser.userId"
      :target-user="selectedUser"
      :is-mutual-friend="selectedUser.isMutualFriend || false"
      @close="closeMessageDialog"
      @read="handleMessageRead(selectedUser.userId)"
    />

    <MobileTabbar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import { useAuthStore } from '@/stores/auth'
import MessageDialog from '@/components/MessageDialog.vue'
import MobileTabbar from '@/components/MobileTabbar.vue'
import { useRouter } from 'vue-router'

interface ConversationUser {
  _id: string
  userId: string
  username: string
  avatar?: string
  isMutualFriend?: boolean
}

interface Conversation {
  userId: string
  username: string
  avatar?: string
  lastMessage?: {
    _id: string
    content: string
    senderId: { _id: string }
    receiverId: { _id: string }
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
}

const authStore = useAuthStore()
const router = useRouter()
const isLoading = ref(false)
const conversations = ref<Conversation[]>([])
const showMessageDialog = ref(false)
const selectedUser = ref<ConversationUser | null>(null)

// 获取对话列表
const fetchConversations = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  isLoading.value = true
  try {
    const response = await apiClient.get('/messages/conversations', {
      params: { limit: 20 }
    })

    if (response.data && Array.isArray(response.data)) {
      conversations.value = response.data
    } else if (response.data && (response.data as any).data && Array.isArray((response.data as any).data)) {
      conversations.value = (response.data as any).data
    } else {
      conversations.value = []
    }
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    conversations.value = []
  } finally {
    isLoading.value = false
  }
}

// 打开消息对话框
const openMessageDialog = async (conv: Conversation) => {
  if (!conv.userId) return

  // 简单的用户对象构造，实际可能需要获取更详细信息
  // 这里为了响应速度，直接使用 conversation 中的信息
  // 如果需要互相关注状态，可能需要额外请求，但在消息列表页通常已经是互相关注或有过交互
  selectedUser.value = {
    _id: conv.userId,
    userId: conv.userId,
    username: conv.username || '未知用户',
    avatar: conv.avatar,
    isMutualFriend: true // 假设能发消息就是朋友或者允许的，简化处理
  }
  showMessageDialog.value = true
}

const closeMessageDialog = () => {
  showMessageDialog.value = false
  selectedUser.value = null
  fetchConversations() // 刷新列表更新未读数
}

const handleMessageRead = (userId: string) => {
  const conv = conversations.value.find(c => c.userId === userId)
  if (conv) {
    conv.unreadCount = 0
  }
}

onMounted(() => {
  fetchConversations()
})
</script>

<style scoped>
.message-list-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}

.nav-bar {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background-color: var(--bg-color);
  z-index: 100;
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-right {
  position: absolute;
  right: 16px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 60px; /* Tabbar space */
}

.conversations-list {
  padding: 0;
}

.conversation-item {
  display: flex;
  padding: 14px 16px;
  gap: 12px;
  background-color: var(--bg-color);
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:active {
  background-color: var(--bg-secondary);
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
}

.avatar-initial {
  font-size: 20px;
  color: var(--text-tertiary);
  font-weight: 600;
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-color);
}

.info-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: 4px;
}

.info-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.username {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.info-bottom {
  display: flex;
  align-items: center;
}

.preview-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100px;
  color: var(--text-tertiary);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
</style>

