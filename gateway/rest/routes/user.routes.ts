/**
 * User Routes
 *
 * Handles all user-related API endpoints including profile management,
 * user discovery, and social connections.
 *
 * @module gateway/rest/routes/user
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// TODO: Inject actual user service client in production
// For now, using mock responses

/**
 * @route   GET /api/v1/users
 * @desc    Get list of users (with pagination and search)
 * @access  Private
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim().escape(),
    query('status').optional().isIn(['online', 'offline', 'all'])
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string || 'all';

      // TODO: Call user service
      // const users = await userService.getUsers({ page, limit, search, status });

      // Mock response for now
      const response = {
        success: true,
        data: {
          users: [],
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
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
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

      // TODO: Call user service
      // const user = await userService.getUserById(id, currentUserId);

      const response = {
        success: true,
        data: {
          id,
          username: 'user_' + id,
          displayName: 'User',
          avatar: null,
          bio: null,
          isOnline: false,
          followerCount: 0,
          followingCount: 0,
          isFollowing: false,
          isOwnProfile: id === currentUserId
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user profile
 * @access  Private (only own profile)
 */
router.put('/:id',
  [
    param('id').isString().notEmpty().trim(),
    body('displayName').optional().isString().trim().isLength({ max: 100 }),
    body('bio').optional().isString().trim().isLength({ max: 500 }),
    body('website').optional().isURL(),
    body('location').optional().isString().trim().isLength({ max: 100 }),
    body('dateOfBirth').optional().isISO8601(),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
    body('country').optional().isString().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const currentUserId = req.user?.userId;

      // Authorization check - can only update own profile
      if (id !== currentUserId) {
        throw new AppError('Not authorized to update this profile', 403);
      }

      const updateData = req.body;

      // TODO: Call user service
      // const updatedUser = await userService.updateUser(id, updateData);

      const response = {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id,
          ...updateData,
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
 * @route   GET /api/v1/users/:id/followers
 * @desc    Get user's followers
 * @access  Private
 */
router.get('/:id/followers',
  [
    param('id').isString().notEmpty().trim(),
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Call user service
      // const followers = await userService.getFollowers(id, { page, limit });

      const response = {
        success: true,
        data: {
          followers: [],
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
 * @route   GET /api/v1/users/:id/following
 * @desc    Get users that the specified user is following
 * @access  Private
 */
router.get('/:id/following',
  [
    param('id').isString().notEmpty().trim(),
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Call user service
      // const following = await userService.getFollowing(id, { page, limit });

      const response = {
        success: true,
        data: {
          following: [],
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
 * @route   POST /api/v1/users/:id/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post('/:id/follow',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: targetUserId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // Can't follow yourself
      if (targetUserId === currentUserId) {
        throw new AppError('Cannot follow yourself', 400);
      }

      // TODO: Call user service
      // const result = await userService.followUser(currentUserId, targetUserId);

      const response = {
        success: true,
        message: 'User followed successfully',
        data: {
          following: true
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/users/:id/follow
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/:id/follow',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: targetUserId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call user service
      // const result = await userService.unfollowUser(currentUserId, targetUserId);

      const response = {
        success: true,
        message: 'User unfollowed successfully',
        data: {
          following: false
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/users/:id/friends
 * @desc    Get user's friends (mutual follows)
 * @access  Private
 */
router.get('/:id/friends',
  [
    param('id').isString().notEmpty().trim(),
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Call user service
      // const friends = await userService.getFriends(id, { page, limit });

      const response = {
        success: true,
        data: {
          friends: [],
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
 * @route   POST /api/v1/users/:id/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/:id/block',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: targetUserId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      if (targetUserId === currentUserId) {
        throw new AppError('Cannot block yourself', 400);
      }

      // TODO: Call user service
      // await userService.blockUser(currentUserId, targetUserId);

      const response = {
        success: true,
        message: 'User blocked successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/users/:id/block
 * @desc    Unblock a user
 * @access  Private
 */
router.delete('/:id/block',
  [
    param('id').isString().notEmpty().trim()
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id: targetUserId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        throw new AppError('Authentication required', 401);
      }

      // TODO: Call user service
      // await userService.unblockUser(currentUserId, targetUserId);

      const response = {
        success: true,
        message: 'User unblocked successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/users/search/:query
 * @desc    Search for users
 * @access  Private
 */
router.get('/search/:query',
  [
    param('query').isString().trim().isLength({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { query: searchQuery } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Call search service
      // const results = await searchService.searchUsers(searchQuery, { page, limit });

      const response = {
        success: true,
        data: {
          users: [],
          query: searchQuery,
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

export { router as userRoutes };
export default router;
