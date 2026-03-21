'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  X,
  FileArchive,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface FileInfo {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** File MIME type */
  type: string;
  /** File URL if already uploaded */
  url?: string;
  /** Preview URL for images/videos */
  preview?: string;
}

interface FilePreviewProps {
  /** File information */
  file: FileInfo;
  /** Handler to remove the file */
  onRemove: () => void;
  /** Additional class names */
  className?: string;
}

// Format file size to human readable format
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get background color based on file type
function getFileColor(type: string): string {
  if (type.startsWith('image/')) return 'bg-purple-100 text-purple-600';
  if (type.startsWith('video/')) return 'bg-pink-100 text-pink-600';
  if (type.startsWith('audio/')) return 'bg-orange-100 text-orange-600';
  if (type.includes('pdf')) return 'bg-red-100 text-red-600';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'bg-yellow-100 text-yellow-600';
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return 'bg-green-100 text-green-600';
  if (type.includes('javascript') || type.includes('typescript')) return 'bg-blue-100 text-blue-600';
  return 'bg-gray-100 text-gray-600';
}

// Separate component for file type icon
const FileTypeIcon = memo(function FileTypeIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
  if (type.startsWith('video/')) return <Video className="w-6 h-6" />;
  if (type.startsWith('audio/')) return <Music className="w-6 h-6" />;
  if (type.includes('pdf')) return <FileText className="w-6 h-6" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return <FileArchive className="w-6 h-6" />;
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return <FileSpreadsheet className="w-6 h-6" />;
  if (type.includes('javascript') || type.includes('typescript') || type.includes('json') || type.includes('html')) return <FileCode className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
});

/**
 * FilePreview component displays a preview of an attached file
 * with an icon based on file type, file name, size, and remove button.
 */
export const FilePreview = memo(function FilePreview({
  file,
  onRemove,
  className
}: FilePreviewProps) {
  const colorClass = getFileColor(file.type);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={cn(
        'relative flex items-start gap-3 p-3 rounded-lg border bg-gray-50',
        className
      )}
    >
      {/* Preview or icon */}
      <div className="flex-shrink-0">
        {isImage && file.preview ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
            <img
              src={file.preview}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : isVideo && file.preview ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 relative">
            <video
              src={file.preview}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Video className="w-6 h-6 text-white" />
            </div>
          </div>
        ) : (
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            colorClass
          )}>
            <FileTypeIcon type={file.type} />
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
});

export default FilePreview;
