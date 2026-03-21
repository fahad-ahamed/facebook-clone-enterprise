/**
 * Storage System - Object Storage Service
 * S3-compatible object storage for files, images, videos
 */

import { Router } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RedisClient } from '../cache-system/redis';
import crypto from 'crypto';

const router = Router();
const redis = new RedisClient();

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT || undefined, // For MinIO/local development
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

const BUCKETS = {
  images: process.env.S3_BUCKET_IMAGES || 'facebook-clone-images',
  videos: process.env.S3_BUCKET_VIDEOS || 'facebook-clone-videos',
  documents: process.env.S3_BUCKET_DOCS || 'facebook-clone-documents',
  temp: process.env.S3_BUCKET_TEMP || 'facebook-clone-temp',
};

// Upload types
interface UploadRequest {
  type: 'image' | 'video' | 'document' | 'avatar' | 'cover' | 'story' | 'reel';
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: Record<string, string>;
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileId: string;
  expiresAt: Date;
}

/**
 * Generate upload URL (direct upload to S3)
 * POST /api/v1/storage/upload-url
 */
router.post('/upload-url', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, fileName, fileSize, mimeType, metadata }: UploadRequest = req.body;

    // Validate file type and size
    const validation = validateUpload(type, fileName, fileSize, mimeType);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_UPLOAD',
        details: validation.errors,
      });
    }

    // Determine bucket based on type
    const bucket = getBucketForType(type);

    // Generate unique file ID and key
    const fileId = generateFileId();
    const key = generateStorageKey(type, userId, fileId, fileName);

    // Create presigned upload URL
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mimeType,
        Metadata: {
          userId,
          type,
          originalName: fileName,
          ...metadata,
        },
      }),
      { expiresIn: 3600 } // 1 hour
    );

    // Store upload metadata in cache
    await redis.setex(
      `upload:${fileId}`,
      3600,
      JSON.stringify({
        userId,
        type,
        fileName,
        fileSize,
        mimeType,
        bucket,
        key,
        status: 'pending',
      })
    );

    res.json({
      success: true,
      data: {
        uploadUrl,
        fileId,
        key,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    res.status(500).json({ success: false, error: 'UPLOAD_URL_FAILED' });
  }
});

/**
 * Confirm upload completion
 * POST /api/v1/storage/confirm/:fileId
 */
router.post('/confirm/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    // Get upload metadata
    const uploadData = await redis.get(`upload:${fileId}`);
    if (!uploadData) {
      return res.status(404).json({
        success: false,
        error: 'UPLOAD_NOT_FOUND',
      });
    }

    const upload = JSON.parse(uploadData);
    
    if (upload.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'NOT_AUTHORIZED',
      });
    }

    // Verify file exists in S3
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: upload.bucket,
        Key: upload.key,
      }));
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'FILE_NOT_UPLOADED',
      });
    }

    // Create file record
    const file = {
      id: fileId,
      userId,
      type: upload.type,
      originalName: upload.fileName,
      size: upload.fileSize,
      mimeType: upload.mimeType,
      bucket: upload.bucket,
      key: upload.key,
      url: getFileUrl(upload.bucket, upload.key),
      status: 'ready',
      createdAt: new Date(),
    };

    // Store file record
    await redis.hset('files', fileId, JSON.stringify(file));
    await redis.del(`upload:${fileId}`);

    // Trigger post-processing based on type
    if (upload.type === 'image') {
      await queueImageProcessing(file);
    } else if (upload.type === 'video') {
      await queueVideoProcessing(file);
    }

    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Upload confirmation error:', error);
    res.status(500).json({ success: false, error: 'CONFIRMATION_FAILED' });
  }
});

/**
 * Get file metadata
 * GET /api/v1/storage/files/:fileId
 */
router.get('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
      });
    }

    const file = JSON.parse(fileData);
    
    // Generate signed download URL if needed
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.key,
      }),
      { expiresIn: 3600 }
    );

    res.json({
      success: true,
      data: {
        ...file,
        downloadUrl,
      },
    });
  } catch (error) {
    console.error('File fetch error:', error);
    res.status(500).json({ success: false, error: 'FILE_FETCH_FAILED' });
  }
});

/**
 * Delete file
 * DELETE /api/v1/storage/files/:fileId
 */
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
      });
    }

    const file = JSON.parse(fileData);
    
    if (file.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'NOT_AUTHORIZED',
      });
    }

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }));

    // Delete thumbnails/variants if exist
    if (file.variants) {
      for (const variant of Object.values(file.variants) as string[]) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: file.bucket,
            Key: variant,
          }));
        } catch (e) {
          // Ignore errors for missing variants
        }
      }
    }

    // Remove file record
    await redis.hdel('files', fileId);

    res.json({ success: true });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ success: false, error: 'FILE_DELETION_FAILED' });
  }
});

/**
 * List user files
 * GET /api/v1/storage/files
 */
router.get('/files', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, page = 1, limit = 20 } = req.query;

    // Get all files for user (would use proper database query in production)
    const allFiles = await redis.hgetall('files');
    const userFiles = Object.values(allFiles)
      .map(f => JSON.parse(f))
      .filter(f => f.userId === userId && (!type || f.type === type))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = (Number(page) - 1) * Number(limit);
    const files = userFiles.slice(offset, offset + Number(limit));

    res.json({
      success: true,
      data: files,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userFiles.length,
      },
    });
  } catch (error) {
    console.error('Files list error:', error);
    res.status(500).json({ success: false, error: 'FILES_LIST_FAILED' });
  }
});

/**
 * Copy file (for sharing/backup)
 * POST /api/v1/storage/files/:fileId/copy
 */
router.post('/files/:fileId/copy', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;
    const { destinationType } = req.body;

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
      });
    }

    const sourceFile = JSON.parse(fileData);
    const newFileId = generateFileId();
    const destinationBucket = getBucketForType(destinationType || sourceFile.type);
    const newKey = generateStorageKey(
      destinationType || sourceFile.type,
      userId,
      newFileId,
      sourceFile.originalName
    );

    // Copy object in S3
    await s3Client.send(new PutObjectCommand({
      Bucket: destinationBucket,
      Key: newKey,
      CopySource: `${sourceFile.bucket}/${sourceFile.key}`,
    }));

    const newFile = {
      ...sourceFile,
      id: newFileId,
      userId,
      bucket: destinationBucket,
      key: newKey,
      url: getFileUrl(destinationBucket, newKey),
      createdAt: new Date(),
    };

    await redis.hset('files', newFileId, JSON.stringify(newFile));

    res.json({ success: true, data: newFile });
  } catch (error) {
    console.error('File copy error:', error);
    res.status(500).json({ success: false, error: 'FILE_COPY_FAILED' });
  }
});

/**
 * Get storage usage statistics
 * GET /api/v1/storage/usage
 */
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user!.id;

    const allFiles = await redis.hgetall('files');
    const userFiles = Object.values(allFiles)
      .map(f => JSON.parse(f))
      .filter(f => f.userId === userId);

    const usage = {
      totalFiles: userFiles.length,
      totalSize: userFiles.reduce((sum, f) => sum + f.size, 0),
      byType: {
        image: { count: 0, size: 0 },
        video: { count: 0, size: 0 },
        document: { count: 0, size: 0 },
      },
    };

    userFiles.forEach(f => {
      if (usage.byType[f.type]) {
        usage.byType[f.type].count++;
        usage.byType[f.type].size += f.size;
      }
    });

    res.json({ success: true, data: usage });
  } catch (error) {
    console.error('Usage fetch error:', error);
    res.status(500).json({ success: false, error: 'USAGE_FETCH_FAILED' });
  }
});

// ==================== Helper Functions ====================

function validateUpload(
  type: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Size limits (in bytes)
  const sizeLimits: Record<string, number> = {
    image: 50 * 1024 * 1024,      // 50 MB
    video: 5 * 1024 * 1024 * 1024, // 5 GB
    document: 100 * 1024 * 1024,   // 100 MB
    avatar: 10 * 1024 * 1024,      // 10 MB
    cover: 20 * 1024 * 1024,       // 20 MB
    story: 100 * 1024 * 1024,      // 100 MB
    reel: 2 * 1024 * 1024 * 1024,  // 2 GB
  };

  if (fileSize > (sizeLimits[type] || 100 * 1024 * 1024)) {
    errors.push(`File size exceeds limit for type ${type}`);
  }

  // MIME type validation
  const allowedMimeTypes: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
    video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    avatar: ['image/jpeg', 'image/png', 'image/webp'],
    cover: ['image/jpeg', 'image/png', 'image/webp'],
    story: ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'],
    reel: ['video/mp4', 'video/quicktime', 'video/webm'],
  };

  const allowed = allowedMimeTypes[type] || [];
  if (allowed.length > 0 && !allowed.includes(mimeType)) {
    errors.push(`MIME type ${mimeType} not allowed for type ${type}`);
  }

  return { valid: errors.length === 0, errors };
}

function getBucketForType(type: string): string {
  const bucketMap: Record<string, string> = {
    image: BUCKETS.images,
    avatar: BUCKETS.images,
    cover: BUCKETS.images,
    story: BUCKETS.images,
    video: BUCKETS.videos,
    reel: BUCKETS.videos,
    document: BUCKETS.documents,
  };
  return bucketMap[type] || BUCKETS.temp;
}

function generateFileId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateStorageKey(type: string, userId: string, fileId: string, originalName: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const ext = originalName.split('.').pop() || 'bin';
  
  return `${type}/${year}/${month}/${userId}/${fileId}.${ext}`;
}

function getFileUrl(bucket: string, key: string): string {
  const cdnUrl = process.env.CDN_URL || `https://${bucket}.s3.amazonaws.com`;
  return `${cdnUrl}/${key}`;
}

async function queueImageProcessing(file: any) {
  // Queue image for processing (resize, optimize, generate thumbnails)
  await redis.lpush('processing:image', JSON.stringify(file));
}

async function queueVideoProcessing(file: any) {
  // Queue video for processing (transcode, generate thumbnails, create HLS)
  await redis.lpush('processing:video', JSON.stringify(file));
}

export default router;
