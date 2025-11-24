<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-container">
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        
        <div v-else-if="article" class="content-wrapper">
          <div class="container">
            <!-- Left: Image Carousel -->
            <aside class="aside">
              <a-carousel
                v-if="article.images && article.images.length > 0"
                :auto-play="false"
                :show-arrow="article.images.length > 1 ? 'hover' : 'never'"
                :dot-position="'bottom'"
                class="image-carousel"
              >
                <a-carousel-item v-for="(image, index) in article.images" :key="index">
                  <div class="carousel-image-wrapper">
                    <img :src="image.url" :alt="`Image ${index + 1}`" class="carousel-image" />
                  </div>
                </a-carousel-item>
              </a-carousel>
              <div v-else class="no-image-placeholder">
                <span>{{ article.title.charAt(0) }}</span>
              </div>
                <div 
                      v-show="!isCommentFocused"
                      class="heart-button"
                      :class="{ liked: article.isLiked, animating: article.animating }"
                      @click="toggleLike"
                    >
                      <span class="heart-icon">{{ article.isLiked ? '❤️' : '🤍' }}</span>
                      <!-- <span class="like-text">{{ article.isLiked ? '已赞' : '点赞' }}</span> -->
                    </div>
              
            </aside>

            <!-- Right: Content -->
            <main class="main">
              <header class="article-header">
                <div class="author-info">
                  <div 
                    class="author-avatar clickable-avatar" 
                    :style="article.author?.avatar ? { backgroundImage: `url(${article.author.avatar})`, backgroundPosition: 'center center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' } : {}"
                    @click.stop="goToProfile(article.author?.id)"
                  >
                    <span v-if="!article.author?.avatar" class="avatar-initial">
                      {{ article.author?.username?.charAt(0).toUpperCase() || 'U' }}
                    </span>
                  </div>
                  <div class="author-details">
                    <div class="author-name">{{ article.author?.username || '未知用户' }}</div>
                    <div class="article-meta">
                      <span class="post-time">{{ formatDate(article.createdAt) }}</span>
                      <span class="view-count">👁️ {{ article.viewCount }}</span>
                    </div>
                  </div>
                  <div class="header-actions">
                    <FollowButton 
                      v-if="article.author && article.author.id !== currentUserId"
                      :user-id="article.author.id"
                      :initial-status="article.author.followStatus"
                      class="follow-btn"
                    />
                    <button class="close-btn" @click="handleClose">✕</button>
                  </div>
                </div>
              </header>

              <div class="article-title">{{ article.title }}</div>

              <div class="content">
                <div class="content-text">{{ article.content }}</div>
              </div>

              <div v-if="article.tags && article.tags.length > 0" class="tag-section">
                <span v-for="(tag, index) in article.tags" :key="index" class="tag-item">
                  #{{ tag }}
                </span>
              </div>

              <div class="divider"></div>

              <!-- Comments Section -->
              <div class="comments-section">
                <div class="comments-header">
                  <span class="comments-title">评论 ({{ comments.length }})</span>
                </div>

                <!-- Comment Input -->
                <div v-if="authStore.isAuthenticated" class="comment-input-wrapper">
               
                </div>
                <div v-else class="comment-login-hint">
                  <span @click="handleLogin" class="login-link">登录后即可评论</span>
                </div>

                <!-- Comments List -->
                <div class="comments-list">
                  <div v-if="isLoadingComments" class="loading-comments">
                    <div class="spinner-small"></div>
                  </div>
                  <div v-else-if="comments.length === 0" class="no-comments">
                    暂无评论，快来抢沙发吧~
                  </div>
                  <div v-else class="comment-items">
                    <div v-for="comment in comments" :key="comment._id" class="comment-item">
                      <div class="comment-main">
                        <div 
                          class="comment-avatar clickable-avatar"
                          :style="comment.userId?.avatar ? { backgroundImage: `url(${comment.userId.avatar})`, backgroundPosition: 'center center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' } : {}"
                          @click.stop="goToProfile(comment.userId?._id)"
                        >
                          <span v-if="!comment.userId?.avatar" class="avatar-initial-small">
                            {{ comment.userId?.username?.charAt(0).toUpperCase() || 'U' }}
                          </span>
                        </div>
                        <div class="comment-content-wrapper">
                          <div class="comment-author">{{ comment.userId?.username || '未知用户' }}</div>
                          <div class="comment-text">{{ comment.content }}</div>
                          <div class="comment-meta">
                            <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
                            <button 
                              v-if="authStore.isAuthenticated"
                              class="reply-btn"
                              @click="startReply(comment._id, comment.userId?.username)"
                            >
                              回复
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Replies -->
                      <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
                        <div v-for="reply in comment.replies" :key="reply._id" class="reply-item">
                          <div 
                            class="comment-avatar small clickable-avatar"
                            :style="reply.userId?.avatar ? { backgroundImage: `url(${reply.userId.avatar})`, backgroundPosition: 'center center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' } : {}"
                            @click.stop="goToProfile(reply.userId?._id)"
                          >
                            <span v-if="!reply.userId?.avatar" class="avatar-initial-small">
                              {{ reply.userId?.username?.charAt(0).toUpperCase() || 'U' }}
                            </span>
                          </div>
                          <div class="comment-content-wrapper">
                            <div class="comment-author">
                              {{ reply.userId?.username || '未知用户' }}
                            </div>
                            <div class="comment-text">{{ reply.content }}</div>
                            <div class="comment-meta">
                              <span class="comment-time">{{ formatDate(reply.createdAt) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Reply Input (shown when replying) -->
                      <div v-if="replyingTo === comment._id" class="reply-input-wrapper">
                        <div class="reply-input">
                          <div class="reply-input-row">
                            <div class="textarea-wrapper">
                              <textarea
                                ref="replyInputRef"
                                v-model="replyContent"
                                :placeholder="`回复 ${replyingToUsername}：`"
                                class="comment-textarea"
                                rows="2"
                                @keydown.ctrl.enter="submitReply(comment._id)"
                                @keydown.meta.enter="submitReply(comment._id)"
                              ></textarea>
                              <button 
                                class="emoji-btn-inline"
                                @click.stop="handleEmojiBtnClick('reply', $event)"
                                type="button"
                                title="添加表情"
                              >
                                😊
                              </button>
                            </div>
                          </div>
                          <div v-if="showReplyEmojiPicker" class="emoji-picker-wrapper">
                            <EmojiPicker @select="handleEmojiSelect" :native="false" />
                          </div>
                          <div class="reply-actions">
                            <button class="cancel-reply-btn" @click="cancelReply">取消</button>
                            <button 
                              class="submit-reply-btn"
                              :disabled="!replyContent.trim() || isSubmittingComment"
                              @click="submitReply(comment._id)"
                            >
                              {{ isSubmittingComment ? '发送中...' : '发送' }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
           
          

              <!-- Actions Section (Bottom) -->
              <div class="actions-section">
                <div class="comment-input">
                    <div 
                      class="comment-avatar"
                      :style="authStore.currentUser?.avatar ? { backgroundImage: `url(${authStore.currentUser.avatar})`, backgroundPosition: 'center center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' } : {}"
                    >
                      <span v-if="!authStore.currentUser?.avatar" class="avatar-initial-small">
                        {{ authStore.currentUser?.username?.charAt(0).toUpperCase() || 'U' }}
                      </span>
                    </div>
                    <div class="input-container">
                      <div class="comment-input-row">
                        <div class="textarea-wrapper">
                          <textarea
                            ref="commentInputRef"
                            v-model="newComment"
                            placeholder="写下你的评论..."
                            class="comment-textarea"
                            rows="2"
                            @focus="isCommentFocused = true"
                            @blur="handleCommentBlur"
                            @keydown.ctrl.enter="submitComment"
                            @keydown.meta.enter="submitComment"
                          ></textarea>
                          <button 
                            class="emoji-btn-inline"
                            @click.stop="handleEmojiBtnClick('comment', $event)"
                            type="button"
                            title="添加表情"
                          >
                            😊
                          </button>
                        </div>
                      </div>
                      <div v-if="showEmojiPicker" class="emoji-picker-wrapper">
                        <EmojiPicker @select="handleEmojiSelect" :native="true" :hide-search="true" :disable-skin-tones="true" />
                      </div>
                      <button 
                        v-show="true"
                        class="submit-comment-btn"
                        :disabled="!newComment.trim() || isSubmittingComment"
                        @click="submitComment"
                      >
                        {{ isSubmittingComment ? '发送中...' : '发送' }}
                      </button>
                    </div>
                  
                  </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import { useAuthStore } from '@/stores/auth'
import FollowButton from '@/components/FollowButton.vue'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

interface ArticleImage {
  url: string
  uploadedAt?: string
  thumbnailUrl?: string
}

interface ArticleAuthor {
  id: string
  username: string
  avatar?: string
  followStatus?: 'none' | 'following' | 'friend' | 'self'
}

interface Article {
  _id: string
  title: string
  content: string
  images: ArticleImage[]
  tags: string[]
  viewCount: number
  createdAt: string
  author?: ArticleAuthor
  isLiked?: boolean
  animating?: boolean
}

const props = defineProps<{
  articleId: string
  visible: boolean
}>()

const emit = defineEmits(['close'])

const router = useRouter()
const authStore = useAuthStore()
const article = ref<Article | null>(null)
const isLoading = ref(false)
const currentUserId = authStore.currentUser?._id

// Comments
const comments = ref<any[]>([])
const isLoadingComments = ref(false)
const newComment = ref('')
const isSubmittingComment = ref(false)
const replyingTo = ref<string | null>(null)
const replyingToUsername = ref<string>('')
const replyContent = ref('')
const isCommentFocused = ref(false)
const showEmojiPicker = ref(false)
const showReplyEmojiPicker = ref(false)
const commentInputRef = ref<HTMLTextAreaElement | null>(null)
const replyInputRef = ref<HTMLTextAreaElement | null>(null)
const emojiPickerTarget = ref<'comment' | 'reply'>('comment')

const fetchArticleDetail = async () => {
  if (!props.articleId) return

  isLoading.value = true
  try {
    const response = await apiClient.get(`/articles/${props.articleId}`)
    
    if (response.data) {
      const data = response.data as any
      article.value = {
        _id: data._id,
        title: data.title,
        content: data.content,
        images: data.images || [],
        tags: data.tags || [],
        viewCount: data.viewCount,
        createdAt: data.createdAt,
        author: data.authorId ? {
          id: data.authorId._id,
          username: data.authorId.username,
          avatar: data.authorId.avatar,
          followStatus: data.authorId.followStatus || 'none'
        } : undefined,
        isLiked: data.isLiked || false,
        animating: false
      }
    }
  } catch (error) {
    console.error('Failed to fetch article detail:', error)
  } finally {
    isLoading.value = false
  }
}

const toggleLike = async () => {
  if (!authStore.isAuthenticated) {
    return
  }

  if (!article.value) return

  // Prevent double click
  if (article.value.animating) return

  const wasLiked = article.value.isLiked || false
  const newLikedState = !wasLiked

  // Optimistic update
  article.value.isLiked = newLikedState
  article.value.animating = true

  try {
    if (newLikedState) {
      await apiClient.post(`/likes/${article.value._id}`)
    } else {
      await apiClient.delete(`/likes/${article.value._id}`)
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      if (article.value) {
        article.value.animating = false
      }
    }, 600)
  } catch (error) {
    // Revert on error
    if (article.value) {
      article.value.isLiked = wasLiked
      article.value.animating = false
    }
    console.error('Like error:', error)
  }
}

const handleClose = () => {
  emit('close')
  article.value = null
  comments.value = []
  newComment.value = ''
  replyingTo.value = null
  replyContent.value = ''
  showEmojiPicker.value = false
  showReplyEmojiPicker.value = false
  document.body.style.overflow = ''
}

const fetchComments = async () => {
  if (!props.articleId) return

  isLoadingComments.value = true
  try {
    const response = await apiClient.get(`/comments/article/${props.articleId}`)
    if (response.data) {
      comments.value = response.data as any[]
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error)
  } finally {
    isLoadingComments.value = false
  }
}

const submitComment = async () => {
  if (!authStore.isAuthenticated || !newComment.value.trim() || isSubmittingComment.value) {
    return
  }

  isSubmittingComment.value = true
  showEmojiPicker.value = false
  try {
    const response = await apiClient.post('/comments', {
      articleId: props.articleId,
      content: newComment.value.trim(),
    })

    if (response.data) {
      // Refresh comments
      await fetchComments()
      newComment.value = ''
    }
  } catch (error) {
    console.error('Failed to submit comment:', error)
    alert('评论失败，请稍后重试')
  } finally {
    isSubmittingComment.value = false
  }
}

const startReply = (commentId: string, username?: string) => {
  replyingTo.value = commentId
  replyingToUsername.value = username || ''
  replyContent.value = ''
}

const cancelReply = () => {
  replyingTo.value = null
  replyingToUsername.value = ''
  replyContent.value = ''
  showReplyEmojiPicker.value = false
}

const submitReply = async (parentCommentId: string) => {
  if (!authStore.isAuthenticated || !replyContent.value.trim() || isSubmittingComment.value) {
    return
  }

  isSubmittingComment.value = true
  showReplyEmojiPicker.value = false
  try {
    const response = await apiClient.post('/comments', {
      articleId: props.articleId,
      content: replyContent.value.trim(),
      parentId: parentCommentId,
    })

    if (response.data) {
      // Refresh comments
      await fetchComments()
      cancelReply()
    }
  } catch (error) {
    console.error('Failed to submit reply:', error)
    alert('回复失败，请稍后重试')
  } finally {
    isSubmittingComment.value = false
  }
}

const handleLogin = () => {
  handleClose()
  router.push('/login')
}

const handleCommentBlur = () => {
  // Delay to allow click events on buttons to fire before hiding
  setTimeout(() => {
    if (!newComment.value.trim()) {
      isCommentFocused.value = false
    }
  }, 200)
}

const handleEmojiSelect = (emoji: any) => {
  if (emojiPickerTarget.value === 'comment') {
    const input = commentInputRef.value
    if (input) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const emojiText = emoji.i || emoji
      newComment.value = newComment.value.substring(0, start) + emojiText + newComment.value.substring(end)
      // Move cursor after the inserted emoji
      setTimeout(() => {
        input.focus()
        const newPosition = start + emojiText.length
        input.setSelectionRange(newPosition, newPosition)
      }, 0)
    }
    showEmojiPicker.value = false
  } else {
    const input = replyInputRef.value
    if (input) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const emojiText = emoji.i || emoji
      replyContent.value = replyContent.value.substring(0, start) + emojiText + replyContent.value.substring(end)
      // Move cursor after the inserted emoji
      setTimeout(() => {
        input.focus()
        const newPosition = start + emojiText.length
        input.setSelectionRange(newPosition, newPosition)
      }, 0)
    }
    showReplyEmojiPicker.value = false
  }
}

const handleEmojiBtnClick = (target: 'comment' | 'reply', event?: MouseEvent) => {
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  
  // Focus input if not focused
  if (target === 'comment' && !isCommentFocused.value) {
    commentInputRef.value?.focus()
    // Wait a bit for focus to take effect
    setTimeout(() => {
      toggleEmojiPicker(target, event)
    }, 50)
  } else {
    toggleEmojiPicker(target, event)
  }
}

const toggleEmojiPicker = (target: 'comment' | 'reply', event?: MouseEvent) => {
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  
  emojiPickerTarget.value = target
  if (target === 'comment') {
    showEmojiPicker.value = !showEmojiPicker.value
    showReplyEmojiPicker.value = false
  } else {
    showReplyEmojiPicker.value = !showReplyEmojiPicker.value
    showEmojiPicker.value = false
  }
  
  // Close emoji picker when clicking outside
  if (showEmojiPicker.value || showReplyEmojiPicker.value) {
    nextTick(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.emoji-picker-wrapper') && !target.closest('.emoji-btn-inline')) {
          showEmojiPicker.value = false
          showReplyEmojiPicker.value = false
          document.removeEventListener('click', handleClickOutside)
        }
      }
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 100)
    })
  }
}

const goToProfile = (userId?: string) => {
  if (!userId) return
  handleClose()
  router.push(`/profile/${userId}`)
}

watch(() => props.articleId, (newId) => {
  if (newId && props.visible) {
    fetchArticleDetail()
    fetchComments()
  } else {
    article.value = null
    comments.value = []
  }
}, { immediate: true })

watch(() => props.visible, (newVisible) => {
  if (newVisible && props.articleId) {
    fetchArticleDetail()
    fetchComments()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  if (props.articleId && props.visible) {
    fetchArticleDetail()
    fetchComments()
  }
})
</script>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.modal-container {
  width: 80%;
  height: 80%;
  max-width: none;
  max-height: none;
  background: var(--bg-color);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-wrapper {
  height: 100%;
  overflow-y: auto;
}

.container {
  display: flex;
  gap: 0;
  height: 100%;
}

/* Left: Image Carousel */
.aside {
  flex: 0.6;
  background-color: var(--bg-secondary);
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.image-carousel {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.carousel-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.carousel-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background: var(--bg-secondary);
}

.no-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
}

/* Right: Content */
.main {
  flex: 0.4;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  padding: 24px;
  height: 100%;
  overflow: hidden;
}

.main > * {
  flex-shrink: 0;
}

.article-header {
  margin-bottom: 20px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.clickable-avatar {
  cursor: pointer;
  transition: opacity 0.2s;
}

.clickable-avatar:hover {
  opacity: 0.8;
}

.avatar-initial {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-tertiary);
}

.author-details {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.article-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.post-time,
.view-count {
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.follow-btn {
  padding: 6px 16px;
  font-size: 14px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.article-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: var(--text-primary);
  line-height: 1.4;
}

.content {
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.content-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.tag-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.tag-item {
  padding: 4px 12px;
  background: rgba(254, 44, 85, 0.1);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 14px;
}

.divider {
  height: 1px;
  width: 100%;
  background: var(--border-color);
  margin: 20px 0;
}

/* Comments Section */
.comments-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 20px;
  overflow: hidden;
}

.comments-header {
  margin-bottom: 16px;
}

.comments-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.comment-input-wrapper {
  margin-bottom: 20px;
}

.comment-input {
  display: flex;
  gap: 12px;
  align-items: center;
  height:30px
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-avatar.small {
  width: 24px;
  height: 24px;
}

.avatar-initial-small {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-tertiary);
}

.input-container {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.comment-input-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.textarea-wrapper {
  position: relative;
  flex:1;
  display: flex;
  align-items: center;
}

.comment-textarea {
  flex: 1;
  height:40px;
  padding: 8px 40px 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  font-family: inherit;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.comment-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.submit-comment-btn {
  padding: 6px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
  width:60px;
}

.submit-comment-btn:hover:not(:disabled) {
  background: #ff1c74;
}

.submit-comment-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-login-hint {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.login-link {
  color: var(--primary-color);
  cursor: pointer;
  text-decoration: underline;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.loading-comments {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
}

.no-comments {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.comment-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.comment-content-wrapper {
  flex: 1;
  min-width: 0;
}

.comment-author {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 6px;
  word-wrap: break-word;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.comment-time {
  color: var(--text-tertiary);
}

.reply-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.reply-btn:hover {
  text-decoration: underline;
}

.replies-list {
  margin-left: 44px;
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.reply-input-wrapper {
  margin-left: 44px;
  margin-top: 8px;
}

.reply-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-input-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.emoji-btn-inline {
  position: absolute;
  right: 6px;
  bottom: 6px;
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s, transform 0.1s, opacity 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  z-index: 10;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  opacity: 0.7;
}

.emoji-btn-inline:hover {
  background: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

.emoji-btn-inline:active {
  transform: scale(0.9);
  opacity: 0.8;
}

.textarea-wrapper:focus-within .emoji-btn-inline {
  opacity: 1;
}

.emoji-picker-wrapper {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bg-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 100%;
  overflow: hidden;
  transform: translateZ(0);
  will-change: transform, opacity;
}

.input-container {
  position: relative;
}

.reply-input {
  position: relative;
}

.reply-input .textarea-wrapper {
  position: relative;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-reply-btn {
  padding: 6px 12px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.cancel-reply-btn:hover {
  background: var(--bg-secondary);
}

.submit-reply-btn {
  padding: 6px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-reply-btn:hover:not(:disabled) {
  background: #ff1c74;
}

.submit-reply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Actions Section (Bottom) */
.actions-section {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.heart-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
 
  backdrop-filter: blur(8px);
 
  z-index: 100;
  flex-shrink: 0;
}

.heart-button:hover {
  /* background: rgba(0, 0, 0, 0.5); */
  transform: scale(1.05);
}

/* .heart-button.liked:hover {
  background: rgba(254, 44, 85, 0.7);
} */

.heart-button.liked {
  /* background: rgba(254, 44, 85, 0.6); */
  backdrop-filter: blur(8px);
  border-color: var(--primary-color);
}

.heart-icon {
  font-size: 20px;
  display: block;
  transition: transform 0.3s ease;
}

.heart-button.animating .heart-icon {
  animation: heartBounce 0.6s ease;
}

.like-text {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
  opacity: 0;
}
</style>
