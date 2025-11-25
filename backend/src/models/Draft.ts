/**
 * 草稿模型
 * SPEC: SPEC-DRAFT-001 - Draft Schema
 */

import mongoose, { Schema, Document } from 'mongoose'
import type { ArticleImage } from '@/types/models'

export interface IDraft extends Document {
  userId: mongoose.Types.ObjectId
  articleId?: mongoose.Types.ObjectId
  title: string
  content: string
  images: ArticleImage[]
  lastSavedAt: Date
  lastEditedAt: Date
  status: 'editing' | 'saving' | 'synced'
  localChecksum?: string
}

const draftSchema = new Schema<IDraft>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    articleId: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      default: null,
    },
    title: {
      type: String,
      required: false,
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    content: {
      type: String,
      required: false,
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
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['editing', 'saving', 'synced'],
      default: 'editing',
    },
    localChecksum: String,
  },
  {
    timestamps: true,
  }
)

// 索引优化
draftSchema.index({ userId: 1, lastSavedAt: -1 })

export const Draft = mongoose.model<IDraft>('Draft', draftSchema)

