// Photo grid component - displays user photos in a grid layout
// Supports click to view full size

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  MoreHorizontal,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Photo {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  createdAt?: string;
  album?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  layout?: 'grid' | 'masonry';
  columns?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  maxPhotos?: number;
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  layout = 'grid',
  columns = 3,
  showViewAll = false,
  onViewAll,
  maxPhotos,
}: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gridLayout, setGridLayout] = useState<'grid' | 'masonry'>(layout);

  const displayPhotos = maxPhotos ? photos.slice(0, maxPhotos) : photos;

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    onPhotoClick?.(photo);
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setSelectedPhoto(photos[selectedIndex - 1]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setSelectedPhoto(photos[selectedIndex + 1]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setSelectedPhoto(null);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Grid3X3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No photos yet</h3>
        <p className="text-gray-500 mt-1">Photos will appear here when posted</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with layout toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">
          Photos
          {photos.length > 0 && (
            <span className="text-gray-500 font-normal ml-2">({photos.length})</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setGridLayout('grid')}
              className={cn(
                "p-1.5 rounded transition-colors",
                gridLayout === 'grid' ? "bg-white shadow" : "hover:bg-gray-200"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridLayout('masonry')}
              className={cn(
                "p-1.5 rounded transition-colors",
                gridLayout === 'masonry' ? "bg-white shadow" : "hover:bg-gray-200"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {showViewAll && photos.length > (maxPhotos || 0) && (
            <Button variant="link" onClick={onViewAll} className="text-[#1877F2]">
              View All Photos
            </Button>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      <div
        className={cn(
          "gap-2",
          gridLayout === 'grid'
            ? "grid"
            : "columns-2 sm:columns-3 md:columns-4 lg:columns-5"
        )}
        style={{
          gridTemplateColumns: gridLayout === 'grid'
            ? `repeat(${columns}, minmax(0, 1fr))`
            : undefined,
        }}
      >
        {displayPhotos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100",
              gridLayout === 'grid' ? "aspect-square" : "mb-2"
            )}
            onClick={() => handlePhotoClick(photo, index)}
          >
            <img
              src={photo.thumbnail || photo.url}
              alt={photo.caption || `Photo ${index + 1}`}
              className={cn(
                "w-full object-cover transition-transform group-hover:scale-105",
                gridLayout === 'grid' ? "h-full" : ""
              )}
              style={{
                height: gridLayout === 'masonry' ? 'auto' : undefined,
              }}
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption && (
                  <p className="text-white text-sm truncate">{photo.caption}</p>
                )}
              </div>
            </div>

            {/* Album badge */}
            {photo.album && (
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {photo.album}
              </div>
            )}

            {/* Show count indicator for last visible photo */}
            {maxPhotos && index === maxPhotos - 1 && photos.length > maxPhotos && (
              <div
                className="absolute inset-0 bg-black/50 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAll?.();
                }}
              >
                <span className="text-white text-xl font-bold">
                  +{photos.length - maxPhotos}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Full Screen Photo Viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent
          className="max-w-5xl w-full h-[90vh] p-0 bg-black/95"
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {selectedIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {selectedIndex < photos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Photo */}
          {selectedPhoto && (
            <div className="w-full h-full flex items-center justify-center p-12">
              <motion.img
                key={selectedPhoto.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || ''}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {/* Photo info footer */}
          {selectedPhoto && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  {selectedPhoto.caption && (
                    <p className="text-sm">{selectedPhoto.caption}</p>
                  )}
                  {selectedPhoto.createdAt && (
                    <p className="text-xs text-gray-300">{selectedPhoto.createdAt}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-white text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5 text-white">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Photo counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-3 py-1 text-white text-sm">
            {selectedIndex + 1} / {photos.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Photo album section component
interface PhotoAlbumSectionProps {
  title: string;
  photos: Photo[];
  onViewAll?: () => void;
}

export function PhotoAlbumSection({ title, photos, onViewAll }: PhotoAlbumSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        {onViewAll && (
          <Button variant="link" onClick={onViewAll} className="text-[#1877F2]">
            See All
          </Button>
        )}
      </div>
      <PhotoGrid
        photos={photos}
        maxPhotos={9}
        columns={3}
        showViewAll={photos.length > 9}
        onViewAll={onViewAll}
      />
    </div>
  );
}
