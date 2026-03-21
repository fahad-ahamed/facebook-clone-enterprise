/**
 * Storage System - Image Processing Service
 * Image optimization, resizing, and transformation
 */

import { Router } from 'express';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { RedisClient } from '../cache-system/redis';

const router = Router();
const redis = new RedisClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, fit: 'cover' as const },
  small: { width: 320, height: 240, fit: 'inside' as const },
  medium: { width: 640, height: 480, fit: 'inside' as const },
  large: { width: 1280, height: 960, fit: 'inside' as const },
  xlarge: { width: 1920, height: 1440, fit: 'inside' as const },
  avatar_small: { width: 50, height: 50, fit: 'cover' as const },
  avatar_medium: { width: 100, height: 100, fit: 'cover' as const },
  avatar_large: { width: 200, height: 200, fit: 'cover' as const },
  cover: { width: 1920, height: 630, fit: 'cover' as const },
  story: { width: 1080, height: 1920, fit: 'inside' as const },
  feed: { width: 1200, height: 900, fit: 'inside' as const },
};

interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'inside' | 'outside';
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  crop?: { x: number; y: number; width: number; height: number };
  watermark?: { text: string; position: 'center' | 'bottom-right' | 'top-left' };
}

/**
 * Process uploaded image
 * POST /api/v1/image-processing/process
 */
router.post('/process', async (req, res) => {
  try {
    const { fileId, operations } = req.body;

    // Get file from storage
    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({ success: false, error: 'FILE_NOT_FOUND' });
    }

    const file = JSON.parse(fileData);
    
    // Download from S3
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }));

    const imageBuffer = await streamToBuffer(response.Body as any);

    // Process image
    const results = await processImage(imageBuffer, operations);

    // Upload processed images
    const processedFiles = [];
    for (const [size, buffer] of Object.entries(results)) {
      const newKey = `${file.key.replace(/\.[^.]+$/, '')}_${size}.${operations.format || 'webp'}`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: file.bucket,
        Key: newKey,
        Body: buffer,
        ContentType: `image/${operations.format || 'webp'}`,
      }));

      processedFiles.push({
        size,
        key: newKey,
        url: `${process.env.CDN_URL}/${newKey}`,
      });
    }

    // Update file record
    file.variants = processedFiles.reduce((acc, f) => {
      acc[f.size] = f.key;
      return acc;
    }, {} as Record<string, string>);
    await redis.hset('files', fileId, JSON.stringify(file));

    res.json({ success: true, data: processedFiles });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ success: false, error: 'PROCESSING_FAILED' });
  }
});

/**
 * Generate all standard sizes for image
 * POST /api/v1/image-processing/generate-sizes/:fileId
 */
router.post('/generate-sizes/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const sizes = req.body.sizes || ['thumbnail', 'small', 'medium', 'large'];

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({ success: false, error: 'FILE_NOT_FOUND' });
    }

    const file = JSON.parse(fileData);

    // Download original
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }));

    const imageBuffer = await streamToBuffer(response.Body as any);
    const sharpImage = sharp(imageBuffer);
    const metadata = await sharpImage.metadata();

    const generatedSizes: Record<string, string> = {};

    for (const sizeName of sizes) {
      const config = IMAGE_SIZES[sizeName as keyof typeof IMAGE_SIZES];
      if (!config) continue;

      const resized = await sharp(imageBuffer)
        .resize(config.width, config.height, { fit: config.fit })
        .webp({ quality: 85 })
        .toBuffer();

      const newKey = `${file.key.replace(/\.[^.]+$/, '')}_${sizeName}.webp`;

      await s3Client.send(new PutObjectCommand({
        Bucket: file.bucket,
        Key: newKey,
        Body: resized,
        ContentType: 'image/webp',
      }));

      generatedSizes[sizeName] = newKey;
    }

    // Update file record
    file.variants = { ...file.variants, ...generatedSizes };
    file.metadata = { width: metadata.width, height: metadata.height };
    await redis.hset('files', fileId, JSON.stringify(file));

    res.json({
      success: true,
      data: {
        original: { width: metadata.width, height: metadata.height },
        generated: Object.entries(generatedSizes).map(([size, key]) => ({
          size,
          url: `${process.env.CDN_URL}/${key}`,
        })),
      },
    });
  } catch (error) {
    console.error('Size generation error:', error);
    res.status(500).json({ success: false, error: 'SIZE_GENERATION_FAILED' });
  }
});

/**
 * Transform image on-the-fly
 * GET /api/v1/image-processing/transform/:fileId
 */
router.get('/transform/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const options: ImageTransformOptions = {
      width: req.query.w ? parseInt(req.query.w as string) : undefined,
      height: req.query.h ? parseInt(req.query.h as string) : undefined,
      fit: req.query.fit as any,
      quality: req.query.q ? parseInt(req.query.q as string) : 85,
      format: req.query.f as any || 'webp',
      blur: req.query.blur ? parseInt(req.query.blur as string) : undefined,
      grayscale: req.query.grayscale === 'true',
    };

    const cacheKey = `img:${fileId}:${JSON.stringify(options)}`;
    
    // Check cache
    const cached = await redis.getBuffer(cacheKey);
    if (cached) {
      res.set('Content-Type', `image/${options.format}`);
      res.set('Cache-Control', 'public, max-age=31536000');
      return res.send(cached);
    }

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({ success: false, error: 'FILE_NOT_FOUND' });
    }

    const file = JSON.parse(fileData);

    // Download and transform
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }));

    const imageBuffer = await streamToBuffer(response.Body as any);
    let transform = sharp(imageBuffer);

    if (options.width || options.height) {
      transform = transform.resize(options.width, options.height, {
        fit: options.fit || 'inside',
      });
    }

    if (options.blur) {
      transform = transform.blur(options.blur);
    }

    if (options.grayscale) {
      transform = transform.grayscale();
    }

    if (options.rotate) {
      transform = transform.rotate(options.rotate);
    }

    if (options.flip) {
      transform = transform.flip();
    }

    if (options.flop) {
      transform = transform.flop();
    }

    if (options.crop) {
      transform = transform.extract(options.crop);
    }

    // Output format
    switch (options.format) {
      case 'jpeg':
        transform = transform.jpeg({ quality: options.quality });
        break;
      case 'png':
        transform = transform.png({ quality: options.quality });
        break;
      case 'avif':
        transform = transform.avif({ quality: options.quality });
        break;
      default:
        transform = transform.webp({ quality: options.quality });
    }

    const outputBuffer = await transform.toBuffer();

    // Cache the result
    await redis.setex(cacheKey, 86400 * 30, outputBuffer); // 30 days

    res.set('Content-Type', `image/${options.format}`);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(outputBuffer);
  } catch (error) {
    console.error('Image transform error:', error);
    res.status(500).json({ success: false, error: 'TRANSFORM_FAILED' });
  }
});

/**
 * Generate blur placeholder
 * GET /api/v1/image-processing/blurhash/:fileId
 */
router.get('/blurhash/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({ success: false, error: 'FILE_NOT_FOUND' });
    }

    const file = JSON.parse(fileData);

    // Check if blurhash already generated
    if (file.blurhash) {
      return res.json({ success: true, data: { blurhash: file.blurhash } });
    }

    // Download and generate blurhash
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }));

    const imageBuffer = await streamToBuffer(response.Body as any);

    // Generate tiny blurred version
    const blurred = await sharp(imageBuffer)
      .resize(20, 20, { fit: 'inside' })
      .blur(2)
      .jpeg({ quality: 50 })
      .toBuffer();

    const blurhash = `data:image/jpeg;base64,${blurred.toString('base64')}`;

    // Store blurhash
    file.blurhash = blurhash;
    await redis.hset('files', fileId, JSON.stringify(file));

    res.json({ success: true, data: { blurhash } });
  } catch (error) {
    console.error('Blurhash generation error:', error);
    res.status(500).json({ success: false, error: 'BLURHASH_FAILED' });
  }
});

/**
 * Extract EXIF data
 * GET /api/v1/image-processing/exif/:fileId
 */
router.get('/exif/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileData = await redis.hget('files', fileId);
    if (!fileData) {
      return res.status(404).json({ success: false, error: 'FILE_NOT_FOUND' });
    }

    const file = JSON.parse(fileData);

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    }));

    const imageBuffer = await streamToBuffer(response.Body as any);
    const metadata = await sharp(imageBuffer).metadata();

    res.json({
      success: true,
      data: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        exif: metadata.exif ? parseExif(metadata.exif) : null,
        iptc: metadata.iptc,
        icc: metadata.icc,
      },
    });
  } catch (error) {
    console.error('EXIF extraction error:', error);
    res.status(500).json({ success: false, error: 'EXIF_FAILED' });
  }
});

// ==================== Helper Functions ====================

async function processImage(
  buffer: Buffer,
  options: ImageTransformOptions
): Promise<Record<string, Buffer>> {
  const results: Record<string, Buffer> = {};

  let transform = sharp(buffer);

  if (options.width || options.height) {
    transform = transform.resize(options.width, options.height, {
      fit: options.fit || 'inside',
    });
  }

  if (options.crop) {
    transform = transform.extract(options.crop);
  }

  if (options.blur) {
    transform = transform.blur(options.blur);
  }

  if (options.grayscale) {
    transform = transform.grayscale();
  }

  if (options.rotate) {
    transform = transform.rotate(options.rotate);
  }

  if (options.sharpen) {
    transform = transform.sharpen();
  }

  // Generate at multiple sizes if requested
  const sizes = options.sizes || ['original'];
  
  for (const size of sizes) {
    let sizeTransform = transform.clone();
    
    if (size !== 'original' && IMAGE_SIZES[size as keyof typeof IMAGE_SIZES]) {
      const config = IMAGE_SIZES[size as keyof typeof IMAGE_SIZES];
      sizeTransform = sizeTransform.resize(config.width, config.height, { fit: config.fit });
    }

    switch (options.format) {
      case 'jpeg':
        results[size] = await sizeTransform.jpeg({ quality: options.quality || 85 }).toBuffer();
        break;
      case 'png':
        results[size] = await sizeTransform.png({ quality: options.quality || 85 }).toBuffer();
        break;
      case 'avif':
        results[size] = await sizeTransform.avif({ quality: options.quality || 85 }).toBuffer();
        break;
      default:
        results[size] = await sizeTransform.webp({ quality: options.quality || 85 }).toBuffer();
    }
  }

  return results;
}

function parseExif(exifBuffer: Buffer): any {
  try {
    // Simple EXIF parsing - in production use a proper EXIF library
    return {
      raw: exifBuffer.toString('base64'),
    };
  } catch {
    return null;
  }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export default router;
