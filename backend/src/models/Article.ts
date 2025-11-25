/**
 * 文章模型
 * SPEC: SPEC-ARTICLE-001 - Article Schema
 */

import mongoose, { Schema, Document } from 'mongoose'
import type { ArticleImage } from '@/types/models'

export interface IArticle extends Document {
  authorId: mongoose.Types.ObjectId
  title: string
  content: string
  images: ArticleImage[]
  tags: string[]
  summary: string
  viewCount: number
  createdAt: Date
  updatedAt: Date
  isDeleted: boolean
  source: 'web' | 'mobile'
}

const articleSchema = new Schema<IArticle>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [100, 'Title must be at most 100 characters'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [10000, 'Content must be at most 10000 characters'],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        thumbnailUrl: String,
        width: Number,
        height: Number,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    summary: {
      type: String,
      maxlength: [200, 'Summary must be at most 200 characters'],
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    source: {
      type: String,
      enum: ['web', 'mobile'],
      default: 'web',
    },
  },
  {
    timestamps: true,
  }
)

// 复合索引 - 用于 Feed 查询
articleSchema.index({ authorId: 1, createdAt: -1 })
articleSchema.index({ createdAt: -1 })
articleSchema.index({ isDeleted: 1, createdAt: -1 })

// 文本索引 - 用于搜索（可选）
articleSchema.index({ title: 'text', content: 'text' })

/**
 * 自动生成摘要
 */
articleSchema.pre('save', function (next) {
  if (!this.summary || this.isModified('content')) {
    // 从内容中提取前 100 个字符作为摘要
    const plainText = this.content.replace(/<[^>]*>/g, '') // 移除 HTML 标签
    this.summary = plainText.substring(0, 100)
  }
  next()
})

export const Article = mongoose.model<IArticle>('Article', articleSchema)

