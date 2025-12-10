import { Router } from 'express'
import { articleService } from '@/services/ArticleService'
import { verifyAuth, optionalAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

router.post('/', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await articleService.create(userId, req.body)
  res.status(201).json({
    code: 0,
    message: 'Article created',
    data: result,
  })
})

/**
 * 搜索文章
 * 注意：这个路由必须放在 /:id 之前，否则 'search' 会被当作 id
 */
router.get('/search', optionalAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId
  const { keyword, page = 1, limit = 20 } = req.query
  
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({
      code: 4001,
      message: 'Keyword is required',
    })
    return
  }
  
  const result = await articleService.search(
    keyword,
    parseInt(page as string),
    parseInt(limit as string),
    userId
  )
  
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

/**
 * 获取热榜文章
 */
router.get('/hot', optionalAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId
  const { limit = 10 } = req.query
  
  const result = await articleService.getHotArticles(
    parseInt(limit as string),
    userId
  )
  
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

/**
 * 获取推荐搜索关键词
 */
router.get('/recommendations', async (req, res) => {
  const { limit = 5 } = req.query
  
  const result = await articleService.getRecommendations(
    parseInt(limit as string)
  )
  
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

router.put('/:id', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await articleService.update(req.params.id, userId, req.body)
  res.json({
    code: 0,
    message: 'Article updated',
    data: result,
  })
})

router.delete('/:id', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  await articleService.delete(req.params.id, userId)
  res.json({
    code: 0,
    message: 'Article deleted',
  })
})

router.get('/:id', optionalAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId
  const result = await articleService.getDetail(req.params.id, userId)
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

export default router
