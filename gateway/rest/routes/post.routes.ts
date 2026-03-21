/**
 * Post Routes
 *
 * Handles all post-related API endpoints including CRUD operations,
 * reactions, comments, and sharing.
 *
 * @module gateway/rest/routes/post
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// Post visibility options
const VISIBILITY_OPTIONS = ['public', 'friends', 'friends_except', 'specific_friends', 'only_me'];

// Reaction types
const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

/**
 * @route   GET /api/v1/posts
 * @desc    Get posts (feed or user's posts)
 * @access  Private
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('userId').optional().isString().trim(),
    query('type').optional().isIn(['feed', 'user', 'timeline'])
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.query.userId as string;
      const type = req.query.type as string || 'feed';
      const currentUserId = req.user?.userId;

      // TODO: Call post service
      // const posts = await postService.getPosts({
      //   currentUserId,
      //   userId,
      //   type,
      //   page,
      //   limit
      // });

      const response = {
        success: true,
        data: {
          posts: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/posts/:id
 * @desc    Get single post by ID
 * @access  Private
 */
router.get('/:id',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const currentUserId = req.user?.userId;

      // TODO: Call post service
      // const post = await postService.getPostById(id, currentUserId);

      const response = {
        success: true,
        data: {
          id,
          content: null,
          media: [],
          author: null,
          visibility: 'public',
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          createdAt: new Date().toISOString(),
          userReaction: null
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/',
  [
    body('content').optional().isString().trim().isLength({ max: 50000 }),
    body('media').optional().isArray({ max: 10 }),
    body('media.*.type').optional().isIn(['image', 'video', 'gif']),
    body('media.*.url').optional().isURL(),
    body('visibility').optional().isIn(VISIBILITY_OPTIONS),
    body('visibilityList').optional().isArray(),
    body('feelings').optional().isString().trim(),
    body('location').optional().isString().trim(),
    body('taggedUsers').optional().isArray({ max: 20 }),
    body('parentId').optional().isString().trim(), // For shared posts
    body('groupId').optional().isString().trim() // For group posts
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const currentUserId = req.user?.userId;
      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      const postData = {
        ...req.body,
        authorId: currentUserId,
        createdAt: new Date().toISOString()
      };

      // Validate that post has content or media
      if (!postData.content && (!postData.media || postData.media.length === 0)) {
        throw new AppError('Post must have content or media', 400);
      }

      // TODO: Call post service
      // const post = await postService.createPost(postData);

      const response = {
        success: true,
        message: 'Post created successfully',
        data: {
          id: 'post_' + Date.now(),
          ...postData
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/posts/:id
 * @desc    Update a post
 * @access  Private (only author)
 */
router.put('/:id',
  [
    param('id').isString().notEmpty().trim(),
    body('content').optional().isString().trim().isLength({ max: 50000 }),
    body('visibility').optional().isIn(VISIBILITY_OPTIONS),
    body('visibilityList').optional().isArray()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call post service with authorization check
      // const post = await postService.updatePost(id, currentUserId, req.body);

      const response = {
        success: true,
        message: 'Post updated successfully',
        data: {
          id,
          ...req.body,
          updatedAt: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/posts/:id
 * @desc    Delete a post (soft delete)
 * @access  Private (only author or admin)
 */
router.delete('/:id',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call post service with authorization check
      // await postService.deletePost(id, currentUserId);

      const response = {
        success: true,
        message: 'Post deleted successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/posts/:id/react
 * @desc    Add or update reaction to a post
 * @access  Private
 */
router.post('/:id/react',
  [
    param('id').isString().notEmpty().trim(),
    body('type').isIn(REACTION_TYPES)
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { type } = req.body;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call reaction service
      // const result = await reactionService.reactToPost(id, currentUserId, type);

      const response = {
        success: true,
        message: 'Reaction added',
        data: {
          reaction: type,
          likeCount: 0 // Updated count
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/posts/:id/react
 * @desc    Remove reaction from a post
 * @access  Private
 */
router.delete('/:id/react',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call reaction service
      // await reactionService.removeReaction(id, currentUserId);

      const response = {
        success: true,
        message: 'Reaction removed',
        data: {
          likeCount: 0
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/posts/:id/reactions
 * @desc    Get all reactions for a post
 * @access  Private
 */
router.get('/:id/reactions',
  [
    param('id').isString().notEmpty().trim(),
    query('type').optional().isIn(REACTION_TYPES),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const type = req.query.type as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Call reaction service
      // const reactions = await reactionService.getPostReactions(id, { type, page, limit });

      const response = {
        success: true,
        data: {
          reactions: [],
          counts: {
            like: 0,
            love: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0,
            total: 0
          },
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Private
 */
router.get('/:id/comments',
  [
    param('id').isString().notEmpty().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('sort').optional().isIn(['newest', 'oldest', 'top'])
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = req.query.sort as string || 'newest';

      // TODO: Call comment service
      // const comments = await commentService.getComments(id, { page, limit, sort });

      const response = {
        success: true,
        data: {
          comments: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/posts/:id/comments
 * @desc    Add a comment to a post
 * @access  Private
 */
router.post('/:id/comments',
  [
    param('id').isString().notEmpty().trim(),
    body('content').isString().trim().isLength({ min: 1, max: 10000 }),
    body('parentId').optional().isString().trim(), // For replies
    body('media').optional().isArray({ max: 5 }),
    body('mentions').optional().isArray({ max: 20 })
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: postId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      const commentData = {
        postId,
        authorId: currentUserId,
        ...req.body,
        createdAt: new Date().toISOString()
      };

      // TODO: Call comment service
      // const comment = await commentService.createComment(commentData);

      const response = {
        success: true,
        message: 'Comment added',
        data: {
          id: 'comment_' + Date.now(),
          ...commentData
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/posts/:id/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (comment author or post author)
 */
router.delete('/:id/comments/:commentId',
  [
    param('id').isString().notEmpty().trim(),
    param('commentId').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: postId, commentId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call comment service with authorization
      // await commentService.deleteComment(commentId, currentUserId, postId);

      const response = {
        success: true,
        message: 'Comment deleted'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/posts/:id/share
 * @desc    Share a post
 * @access  Private
 */
router.post('/:id/share',
  [
    param('id').isString().notEmpty().trim(),
    body('content').optional().isString().trim().isLength({ max: 5000 }),
    body('visibility').optional().isIn(VISIBILITY_OPTIONS)
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: originalPostId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call post service
      // const sharedPost = await postService.sharePost(originalPostId, currentUserId, req.body);

      const response = {
        success: true,
        message: 'Post shared successfully',
        data: {
          id: 'shared_post_' + Date.now(),
          parentId: originalPostId,
          authorId: currentUserId,
          ...req.body
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/posts/:id/save
 * @desc    Save a post for later
 * @access  Private
 */
router.post('/:id/save',
  [
    param('id').isString().notEmpty().trim(),
    body('collection').optional().isString().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { collection } = req.body;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call save service
      // await saveService.savePost(id, currentUserId, collection);

      const response = {
        success: true,
        message: 'Post saved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/posts/:id/save
 * @desc    Unsave a post
 * @access  Private
 */
router.delete('/:id/save',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call save service
      // await saveService.unsavePost(id, currentUserId);

      const response = {
        success: true,
        message: 'Post unsaved successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/posts/:id/report
 * @desc    Report a post
 * @access  Private
 */
router.post('/:id/report',
  [
    param('id').isString().notEmpty().trim(),
    body('reason').isIn(['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'misinformation', 'other']),
    body('details').optional().isString().trim().isLength({ max: 1000 })
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { reason, details } = req.body;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call moderation service
      // await moderationService.reportContent({
      //   contentType: 'post',
      //   contentId: id,
      //   reporterId: currentUserId,
      //   reason,
      //   details
      // });

      const response = {
        success: true,
        message: 'Report submitted. Thank you for helping keep our community safe.'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export { router as postRoutes };
export default router;
