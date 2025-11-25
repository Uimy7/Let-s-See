/**
 * 数据模型类型定义
 * SPEC: 按照实现方案文档中的数据模型定义
 */

// ============ User 相关 ============
export interface User {
  _id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  isActive: boolean
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: User
}

// ============ Article 相关 ============
export interface Article {
  _id: string
  authorId: string
  title: string
  content: string
  images: ArticleImage[]
  tags: string[]
  summary: string
  viewCount: number
  createdAt: string
  updatedAt: string
  isDeleted: boolean
  source: 'web' | 'mobile'
  author?: User
}

export interface ArticleImage {
  url: string
  uploadedAt: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

export interface CreateArticleRequest {
  title: string
  content: string
  images: ArticleImage[]
  tags: string[]
}

export interface UpdateArticleRequest {
  title?: string
  content?: string
  images?: ArticleImage[]
  tags?: string[]
}

// ============ Draft 相关 ============
export interface Draft {
  _id: string
  userId: string
  articleId?: string
  title: string
  content: string
  images: DraftImage[]
  lastSavedAt: string
  lastEditedAt: string
  status: 'editing' | 'saving' | 'synced'
  localChecksum?: string
}

export interface DraftImage {
  url: string
  isLocalPreview: boolean
  blob?: Blob
}

export interface SaveDraftRequest {
  title: string
  content: string
  images: DraftImage[]
  articleId?: string
}

// ============ Feed 相关 ============
export interface FeedItem {
  id: string
  title: string
  summary: string
  lastImageUrl?: string
  lastImageWidth?: number
  lastImageHeight?: number
  author: {
    id: string
    username: string
    avatar?: string
    followStatus?: 'none' | 'following' | 'friend' | 'self'
  }
  viewCount: number
  createdAt: string
  isLiked?: boolean
  animating?: boolean
}

export interface FeedResponse {
  articles: FeedItem[]
  hasMore: boolean
  nextCursor?: string
}

export interface FeedParams {
  page?: number
  pageSize?: number
  sortBy?: 'time' | 'popularity'
  cursor?: string
  lastId?: string
}

// ============ 上传相关 ============
export interface UploadResponse {
  imageUrl: string
  thumbnailUrl?: string
}

// ============ API 响应格式 ============
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  timestamp?: string
}

// ============ 离线相关 ============
export interface IndexedDBDraft {
  draftId: string
  userId: string
  title: string
  content: string
  images: Array<{
    url: string
    isLocalPreview: boolean
    blob?: Blob
  }>
  lastEditedAt: number
  offlineOnly: boolean
}

export interface SyncQueueItem {
  id: string
  type: 'draft' | 'article'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
}

