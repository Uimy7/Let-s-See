/**
 * 后端数据模型类型定义
 * SPEC: 按照实现方案文档中的数据模型定义
 */

// ============ 请求/响应类型 ============
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  timestamp?: string
}

// ============ 认证相关 ============
export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: UserDTO
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// ============ 用户相关 ============
export interface UserDTO {
  _id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  createdAt: string
  updatedAt: string
}

// ============ 文章相关 ============
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

export interface ArticleImage {
  url: string
  uploadedAt: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

export interface ArticleDTO {
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
  author?: UserDTO
}

// ============ 草稿相关 ============
export interface SaveDraftRequest {
  title: string
  content: string
  images: ArticleImage[]
  articleId?: string
  localChecksum?: string
}

export interface DraftDTO {
  _id: string
  userId: string
  articleId?: string
  title: string
  content: string
  images: ArticleImage[]
  lastSavedAt: string
  lastEditedAt: string
  status: 'editing' | 'saving' | 'synced'
  localChecksum?: string
}

// ============ Feed 相关 ============
export interface FeedQueryParams {
  page?: number
  pageSize?: number
  sortBy?: 'time' | 'popularity'
  cursor?: string
  lastId?: string
}

export interface FeedItemDTO {
  id: string
  title: string
  summary: string
  lastImageUrl?: string
  author: {
    id: string
    username: string
    avatar?: string
  }
  viewCount: number
  createdAt: string
}

export interface FeedResponse {
  articles: FeedItemDTO[]
  hasMore: boolean
  nextCursor?: string
  total?: number
}

// ============ 上传相关 ============
export interface UploadResponse {
  imageUrl: string
  thumbnailUrl?: string
}

// ============ 离线同步相关 ============
export interface SyncItem {
  type: 'draft' | 'article'
  action: 'create' | 'update' | 'delete'
  data: any
}

export interface SyncRequest {
  items: SyncItem[]
}

// ============ 错误码常量 ============
export const ErrorCodes = {
  SUCCESS: 0,
  USER_NOT_FOUND: 4001,
  INVALID_PASSWORD: 4002,
  TOKEN_EXPIRED: 4003,
  UNAUTHORIZED: 4004,
  RESOURCE_NOT_FOUND: 4005,
  INVALID_PARAMS: 4006,
  CONFLICT: 4007,
  RATE_LIMIT_EXCEEDED: 4008,
  SERVER_ERROR: 5001,
  DATABASE_ERROR: 5002,
  UPLOAD_FAILED: 5003,
} as const

// ============ JWT Payload ============
export interface JWTPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

