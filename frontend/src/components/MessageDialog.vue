<template>
  <Transition name="slide-right">
    <div v-if="visible" class="message-page">
      <div class="page-header">
        <button class="back-btn" @click="handleClose">
          <span class="icon">‹</span>
        </button>
        <div class="header-title">
          <span class="username">{{ targetUser?.username || '用户' }}</span>
          <div v-if="!isMutualFriend" class="limit-tag">陌生人</div>
        </div>
        <button class="more-btn">⋯</button>
      </div>

      <div class="page-content" ref="messagesContainer">
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        
        <div v-else class="messages-list">
          <div v-if="messages.length === 0" class="empty-messages">
            <div class="empty-icon">👋</div>
            <p>打个招呼吧~</p>
          </div>
          
          <div
            v-for="message in messages"
            :key="message._id"
            class="message-row"
            :class="{ 'message-sent': getSenderId(message) === currentUserId }"
          >
            <div v-if="shouldShowTime(message)" class="time-stamp">
              {{ formatDate(message.createdAt) }}
            </div>
            
            <div class="message-bubble-group">
              <div 
                v-if="getSenderId(message) !== currentUserId"
                class="avatar"
                :style="getSenderAvatar(message) ? { backgroundImage: `url(${getSenderAvatar(message)})` } : {}"
              >
                <span v-if="!getSenderAvatar(message)" class="avatar-text">
                  {{ getSenderUsername(message)?.charAt(0).toUpperCase() }}
                </span>
              </div>
              
              <div class="bubble">
                {{ message.content }}
              </div>
              
              <div 
                v-if="getSenderId(message) === currentUserId"
                class="avatar"
                :style="authStore.currentUser?.avatar ? { backgroundImage: `url(${authStore.currentUser.avatar})` } : {}"
              >
                <span v-if="!authStore.currentUser?.avatar" class="avatar-text">
                  {{ authStore.currentUser?.username?.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <div v-if="!isMutualFriend && hasSentMessage" class="limit-tip">
          需对方回复后才能继续发送
        </div>
        <div class="input-bar">
          <button class="icon-btn voice-btn">🎤</button>
          <div class="input-box-wrapper">
            <input
              v-model="messageContent"
              placeholder="发消息..."
              class="chat-input"
              :disabled="!isMutualFriend && hasSentMessage"
              @keydown.enter="sendMessage"
            />
          </div>
          <button class="icon-btn emoji-btn">😊</button>
          <button 
            v-if="!messageContent.trim()" 
            class="icon-btn plus-btn"
          >
            ⊕
          </button>
          <button 
            v-else 
            class="send-btn-small"
            :disabled="isSending"
            @click="sendMessage"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { io, Socket } from 'socket.io-client'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import { useAuthStore } from '@/stores/auth'

interface MessageUser {
  _id: string
  username: string
  avatar?: string
}

interface Message {
  _id: string
  senderId: MessageUser
  receiverId: MessageUser
  content: string
  isRead: boolean
  createdAt: string
}

interface Props {
  visible: boolean
  targetUserId: string
  targetUser?: {
    _id: string
    username: string
    avatar?: string
  }
  isMutualFriend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMutualFriend: false,
})

const emit = defineEmits<{
  close: []
  read: [userId: string]
}>()

const authStore = useAuthStore()
const currentUserId = authStore.currentUser?._id
const socket = ref<Socket | null>(null)
const messages = ref<Message[]>([])
const messageContent = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const hasSentMessage = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// 初始化 WebSocket 连接
const initSocket = () => {
  if (!authStore.token || socket.value) return

  // 使用与API相同的base URL
  const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3000'
  socket.value = io(wsUrl, {
    auth: {
      token: authStore.token,
    },
    transports: ['websocket', 'polling'],
  })

  socket.value.on('connect', () => {
    console.log('WebSocket connected')
  })

  socket.value.on('new_message', (message: Message) => {
    messages.value.push(message)
    scrollToBottom()
  })

  socket.value.on('message_sent', (message: Message) => {
    messages.value.push(message)
    hasSentMessage.value = true
    messageContent.value = ''
    isSending.value = false
    scrollToBottom()
  })

  socket.value.on('message_error', (error: { message: string }) => {
    alert(error.message)
    isSending.value = false
  })

  socket.value.on('disconnect', () => {
    console.log('WebSocket disconnected')
  })
}

// 断开 WebSocket 连接
const disconnectSocket = () => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
}

// 获取对话历史
const fetchConversation = async () => {
  if (!props.targetUserId || !currentUserId) return

  isLoading.value = true
  try {
    const response = await apiClient.get<Message[]>(`/messages/conversation/${props.targetUserId}`)
    if (response.data) {
      messages.value = response.data
      
      // 检查是否已经发送过消息
      hasSentMessage.value = messages.value.some(
        (msg) => getSenderId(msg) === currentUserId
      )
      
      scrollToBottom()
    }
  } catch (error) {
    console.error('Failed to fetch conversation:', error)
  } finally {
    isLoading.value = false
  }
}

// 发送消息
const sendMessage = async () => {
  if (!messageContent.value.trim() || isSending.value) return
  if (!props.isMutualFriend && hasSentMessage.value) return

  isSending.value = true

  try {
    if (socket.value && socket.value.connected) {
      // 使用 WebSocket 发送
      socket.value.emit('send_message', {
        receiverId: props.targetUserId,
        content: messageContent.value.trim(),
      })
    } else {
      // 降级到 HTTP API
      const response = await apiClient.post<Message>('/messages', {
        receiverId: props.targetUserId,
        content: messageContent.value.trim(),
      })
      
      if (response.data) {
        messages.value.push(response.data)
        hasSentMessage.value = true
        messageContent.value = ''
        scrollToBottom()
      }
      isSending.value = false
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '发送失败，请稍后重试')
    isSending.value = false
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 关闭对话框
const handleClose = () => {
  emit('close')
  messageContent.value = ''
  messages.value = []
  hasSentMessage.value = false
}

// 获取发送者ID（兼容不同的数据结构）
const getSenderId = (message: Message): string => {
  if (typeof message.senderId === 'string') {
    return message.senderId
  }
  return message.senderId?._id || (message.senderId as any)?.id || ''
}

// 获取发送者用户名
const getSenderUsername = (message: Message): string => {
  if (typeof message.senderId === 'string') {
    return '用户'
  }
  return message.senderId?.username || '用户'
}

// 获取发送者头像
const getSenderAvatar = (message: Message): string | undefined => {
  if (typeof message.senderId === 'string') {
    return undefined
  }
  return message.senderId?.avatar
}

// 标记对话为已读
const markConversationAsRead = async () => {
  if (!props.targetUserId || !currentUserId) return

  console.log('🟡 Marking conversation as read for user:', props.targetUserId)

  try {
    await apiClient.put(`/messages/conversation/${props.targetUserId}/read`)
    console.log('✅ Successfully marked as read, emitting read event')
    // 触发父组件更新未读数，传递用户ID
    emit('read', props.targetUserId)
  } catch (error) {
    console.error('❌ Failed to mark conversation as read:', error)
  }
}

// 监听 visible 变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    initSocket()
    fetchConversation()
    // 对话框打开时标记为已读
    markConversationAsRead()
  } else {
    disconnectSocket()
  }
})

// 是否显示时间戳（两条消息间隔超过5分钟）
const shouldShowTime = (message: Message) => {
  const index = messages.value.findIndex(m => m._id === message._id)
  if (index === 0) return true
  const prevMessage = messages.value[index - 1]
  const timeDiff = new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
  return timeDiff > 5 * 60 * 1000
}

onMounted(() => {
  if (props.visible) {
    initSocket()
    fetchConversation()
  }
})

onUnmounted(() => {
  disconnectSocket()
})
</script>

<style scoped>
.message-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-color);
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.page-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--bg-color);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.back-btn, .more-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.username {
  font-size: 16px;
  font-weight: 600;
}

.limit-tag {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 2px;
  color: var(--text-tertiary);
}

.page-content {
  flex: 1;
  overflow-y: auto;
  background: #1c1c1e; /* Slightly different dark bg */
  padding: 16px 12px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-sent {
  align-items: flex-end;
}

.time-stamp {
  align-self: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 12px;
}

.message-bubble-group {
  display: flex;
  gap: 8px;
  max-width: 80%;
}

.message-sent .message-bubble-group {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #333;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 14px;
  font-weight: 600;
  color: #999;
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.5;
  background: #2c2c2e;
  color: white;
  position: relative;
  word-wrap: break-word;
}

.message-sent .bubble {
  background: #0a84ff; /* iOS Blue style */
  color: white;
}

.page-footer {
  background: var(--bg-color);
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-box-wrapper {
  flex: 1;
  background: #2c2c2e;
  border-radius: 20px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

.chat-input {
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  font-size: 15px;
  padding: 0;
  outline: none;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #444;
  background: transparent;
  color: white;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn-small {
  padding: 6px 12px;
  background: #0a84ff;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
}

/* Slide Transition */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>

