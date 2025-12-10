import { Article, IArticle } from '@/models/Article'
import { Follow } from '@/models/Follow'
import { Like } from '@/models/Like'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'
import { socialService } from '@/services/SocialService'
import { likeService } from '@/services/LikeService'

export class ArticleService {
  async create(userId: string, data: Partial<IArticle>) {
    const article = new Article({
      ...data,
      authorId: userId,
    })
    await article.save()
    return article
  }

  async update(id: string, userId: string, data: Partial<IArticle>) {
    const article = await Article.findOne({ _id: id, authorId: userId })
    if (!article) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found or permission denied', 404)
    }
    
    Object.assign(article, data)
    await article.save()
    return article
  }

  async delete(id: string, userId: string) {
    const article = await Article.findOne({ _id: id, authorId: userId })
    if (!article) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found or permission denied', 404)
    }
    
    article.isDeleted = true
    await article.save()
  }

  async getDetail(id: string, currentUserId?: string) {
    const article = await Article.findById(id).populate('authorId', 'username avatar bio').lean()
    if (!article || article.isDeleted) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found', 404)
    }
    
    // Increment view count
    await Article.findByIdAndUpdate(id, { $inc: { viewCount: 1 } })
    
    // Update the viewCount in the returned object to reflect the increment
    ;(article as any).viewCount = ((article as any).viewCount || 0) + 1
    
    // Populate follow status and like status if user is logged in
    if (currentUserId) {
      // Set like status
      const isLiked = await likeService.isLiked(currentUserId, id)
      ;(article as any).isLiked = isLiked
      
      // Set follow status
      if ((article as any).authorId._id.toString() === currentUserId) {
        ;(article as any).authorId.followStatus = 'self'
      } else {
        ;(article as any).authorId.followStatus = await socialService.getFollowStatus(
          currentUserId,
          (article as any).authorId._id.toString()
        )
      }
    } else {
      ;(article as any).authorId.followStatus = 'none'
      ;(article as any).isLiked = false
    }
    
    return article
  }

  async getFeed(page: number = 1, limit: number = 10, currentUserId?: string, type: 'recommended' | 'following' | 'friends' | 'liked' = 'recommended', authorId?: string, likedUserId?: string) {
    const skip = (page - 1) * limit
    
    let query: any = { isDeleted: false }
    
    // If authorId is provided, filter by author
    if (authorId) {
      query.authorId = authorId
    }
    
    // If type is 'following', filter by followed users
    if (type === 'following' && currentUserId) {
      // Get list of followed user IDs
      const follows = await Follow.find({ followerId: currentUserId })
      const followedUserIds = follows.map(f => f.followingId)
      
      if (followedUserIds.length === 0) {
        // No following users, return empty result
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      query.authorId = { $in: followedUserIds }
    }
    
    // If type is 'friends', filter by mutual follows (friends)
    if (type === 'friends' && currentUserId) {
      // Get list of users that current user follows
      const following = await Follow.find({ followerId: currentUserId })
      const followingIds = following.map(f => f.followingId)
      
      if (followingIds.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      // Get list of users that follow current user back (mutual follows)
      const mutualFollows = await Follow.find({
        followerId: { $in: followingIds },
        followingId: currentUserId
      })
      const friendIds = mutualFollows.map(f => f.followerId)
      
      if (friendIds.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      query.authorId = { $in: friendIds }
    }
    
    // If type is 'liked', filter by liked articles
    // Use likedUserId if provided, otherwise use currentUserId
    const targetUserId = likedUserId || currentUserId
    if (type === 'liked' && targetUserId) {
      // Get total count of likes first
      const totalLikes = await Like.countDocuments({ userId: targetUserId })
      
      if (totalLikes === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      // Get list of article IDs that user has liked (with pagination)
      const likes = await Like.find({ userId: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('articleId')
        .lean()
      
      const likedArticleIds = likes.map(like => like.articleId.toString())
      
      if (likedArticleIds.length === 0) {
        return {
          items: [],
          total: totalLikes,
          page,
          limit,
          totalPages: Math.ceil(totalLikes / limit)
        }
      }
      
      query._id = { $in: likedArticleIds }
      
      // Get articles and maintain order
      const articlesResult = await Article.find(query)
        .populate('authorId', 'username avatar bio')
        .lean()
      
      // Sort articles to match the order of likedArticleIds
      const articlesMap = new Map(articlesResult.map((article: any) => [article._id.toString(), article]))
      const articles = likedArticleIds
        .map(id => articlesMap.get(id))
        .filter(Boolean) as any[]
      
      // Populate follow status and like status if user is logged in
      if (currentUserId) {
        await Promise.all(articles.map(async (article: any) => {
          // All articles in liked feed are liked by definition
          article.isLiked = true
          
          // Set follow status
          if (article.authorId._id.toString() === currentUserId) {
            article.authorId.followStatus = 'self'
          } else {
            article.authorId.followStatus = await socialService.getFollowStatus(
              currentUserId, 
              article.authorId._id.toString()
            )
          }
        }))
      } else {
        articles.forEach((article: any) => {
          article.authorId.followStatus = 'none'
          article.isLiked = false
        })
      }
      
      return {
        items: articles,
        total: totalLikes,
        page,
        limit,
        totalPages: Math.ceil(totalLikes / limit)
      }
    }
    
    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatar bio')
      .lean() // Use lean() to return plain JS objects so we can add properties
    
    const total = await Article.countDocuments(query)
    
    // Populate follow status and like status if user is logged in
    if (currentUserId) {
      const articleIds = articles.map((article: any) => article._id.toString())
      const likedMap = await likeService.checkLikedStatus(currentUserId, articleIds)
      
      await Promise.all(articles.map(async (article: any) => {
        // Set like status
        article.isLiked = likedMap[article._id.toString()] || false
        
        // Set follow status
        if (article.authorId._id.toString() === currentUserId) {
          article.authorId.followStatus = 'self'
        } else {
          article.authorId.followStatus = await socialService.getFollowStatus(
            currentUserId, 
            article.authorId._id.toString()
          )
        }
      }))
    } else {
      articles.forEach((article: any) => {
        article.authorId.followStatus = 'none'
        article.isLiked = false
      })
    }
    
    return {
      items: articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * 搜索文章
   */
  async search(keyword: string, page: number = 1, limit: number = 20, currentUserId?: string) {
    const skip = (page - 1) * limit
    
    // 使用MongoDB文本搜索或正则表达式搜索
    const query: any = {
      isDeleted: false,
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
        { summary: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } }
      ]
    }
    
    const articles = await Article.find(query)
      .sort({ viewCount: -1, createdAt: -1 }) // 按浏览量和时间排序
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatar bio')
      .lean()
    
    const total = await Article.countDocuments(query)
    
    // Populate like status if user is logged in
    if (currentUserId) {
      const articleIds = articles.map((article: any) => article._id.toString())
      const likedMap = await likeService.checkLikedStatus(currentUserId, articleIds)
      
      articles.forEach((article: any) => {
        article.isLiked = likedMap[article._id.toString()] || false
      })
    } else {
      articles.forEach((article: any) => {
        article.isLiked = false
      })
    }
    
    return {
      items: articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * 获取热榜文章（按浏览量排序）
   */
  async getHotArticles(limit: number = 10, currentUserId?: string) {
    const articles = await Article.find({ isDeleted: false })
      .sort({ viewCount: -1, createdAt: -1 }) // 按浏览量降序，浏览量相同则按时间降序
      .limit(limit)
      .populate('authorId', 'username avatar bio')
      .lean()
    
    // Populate like status if user is logged in
    if (currentUserId) {
      const articleIds = articles.map((article: any) => article._id.toString())
      const likedMap = await likeService.checkLikedStatus(currentUserId, articleIds)
      
      articles.forEach((article: any) => {
        article.isLiked = likedMap[article._id.toString()] || false
      })
    } else {
      articles.forEach((article: any) => {
        article.isLiked = false
      })
    }
    
    return {
      items: articles
    }
  }

  /**
   * 获取推荐搜索关键词（基于热门标签和热门文章标题）
   */
  async getRecommendations(limit: number = 5) {
    // 获取最热门的标签
    const hotArticles = await Article.find({ isDeleted: false })
      .sort({ viewCount: -1 })
      .limit(20)
      .select('tags title')
      .lean()
    
    // 收集所有标签
    const tagFrequency = new Map<string, number>()
    const titleKeywords = new Set<string>()
    
    hotArticles.forEach((article: any) => {
      // 统计标签频率
      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach((tag: string) => {
          tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1)
        })
      }
      
      // 提取标题关键词（简单实现：按空格分割，取较长的词）
      if (article.title) {
        const words = article.title.split(/[\s,，、。.]+/)
        words.forEach((word: string) => {
          if (word.length >= 2 && word.length <= 10) {
            titleKeywords.add(word)
          }
        })
      }
    })
    
    // 按频率排序标签
    const sortedTags = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, Math.ceil(limit / 2))
    
    // 从标题关键词中随机选择一些
    const keywordArray = Array.from(titleKeywords)
    const randomKeywords = keywordArray
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.ceil(limit / 2))
    
    // 合并并去重
    const recommendations = [...sortedTags, ...randomKeywords]
      .filter((item, index, self) => self.indexOf(item) === index)
      .slice(0, limit)
    
    // 如果推荐词太少，添加一些默认推荐
    const defaultRecommendations = ['旅游攻略', '美食推荐', '科技资讯', '生活日常', '学习笔记', '摄影分享', '运动健身', '电影评论']
    while (recommendations.length < limit) {
      const randomDefault = defaultRecommendations[Math.floor(Math.random() * defaultRecommendations.length)]
      if (!recommendations.includes(randomDefault)) {
        recommendations.push(randomDefault)
      }
    }
    
    return {
      keywords: recommendations
    }
  }
}

export const articleService = new ArticleService()
