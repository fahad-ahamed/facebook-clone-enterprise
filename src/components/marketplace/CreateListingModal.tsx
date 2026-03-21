'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  X,
  ImagePlus,
  MapPin,
  DollarSign,
  Tag,
  Package,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { MARKETPLACE_CATEGORIES } from './ListingsGrid';

interface CreateListingData {
  title: string;
  description: string;
  price: string;
  currency: string;
  negotiable: boolean;
  category: string;
  subcategory: string;
  condition: 'new' | 'like_new' | 'used' | 'fair';
  brand: string;
  images: string[];
  location: string;
  city: string;
  state: string;
  country: string;
}

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateListingData) => Promise<void> | void;
}

const CURRENCIES = [
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'EUR', label: '€ EUR', symbol: '€' },
  { value: 'GBP', label: '£ GBP', symbol: '£' },
  { value: 'JPY', label: '¥ JPY', symbol: '¥' },
  { value: 'INR', label: '₹ INR', symbol: '₹' },
];

const CONDITIONS = [
  { value: 'new', label: 'New', description: 'Brand new, never used' },
  { value: 'like_new', label: 'Like New', description: 'Excellent condition, barely used' },
  { value: 'used', label: 'Used', description: 'Good condition, some signs of wear' },
  { value: 'fair', label: 'Fair', description: 'Acceptable condition, visible wear' },
];

const initialFormData: CreateListingData = {
  title: '',
  description: '',
  price: '',
  currency: 'USD',
  negotiable: false,
  category: '',
  subcategory: '',
  condition: 'used',
  brand: '',
  images: [],
  location: '',
  city: '',
  state: '',
  country: '',
};

export function CreateListingModal({ isOpen, onClose, onCreate }: CreateListingModalProps) {
  const [formData, setFormData] = useState<CreateListingData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (formData.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // For demo purposes, we'll use object URLs
    // In production, you'd upload to a server and get real URLs
    const newImages: string[] = [];
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      newImages.push(url);
    });

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages].slice(0, 10), // Max 10 images
    }));
    setErrors(prev => ({ ...prev, images: '' }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      await onCreate(formData);
      // Reset form and close modal
      setFormData(initialFormData);
      setStep(1);
      setCurrentImageIndex(0);
      onClose();
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData(initialFormData);
      setStep(1);
      setErrors({});
      setCurrentImageIndex(0);
      onClose();
    }
  };

  const selectedCurrency = CURRENCIES.find(c => c.value === formData.currency);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <DialogTitle className="text-xl font-bold">
                {step === 1 ? 'Create Listing' : 'Add Photos & Location'}
              </DialogTitle>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2 mt-3">
            {[1, 2].map(s => (
              <div
                key={s}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  s <= step ? 'bg-blue-500' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="What are you selling?"
                    className={cn(errors.title && 'border-red-500')}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={value =>
                      setFormData(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger className={cn(errors.category && 'border-red-500')}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETPLACE_CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500">{errors.category}</p>
                  )}
                </div>

                {/* Condition */}
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITIONS.map(cond => (
                      <button
                        key={cond.value}
                        type="button"
                        onClick={() =>
                          setFormData(prev => ({
                            ...prev,
                            condition: cond.value as CreateListingData['condition'],
                          }))
                        }
                        className={cn(
                          'p-3 rounded-lg border-2 text-left transition-all',
                          formData.condition === cond.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <p className="font-medium">{cond.label}</p>
                        <p className="text-xs text-gray-500">{cond.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.currency}
                      onValueChange={value =>
                        setFormData(prev => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.symbol} {c.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, price: e.target.value }))
                      }
                      placeholder="0.00"
                      className={cn('flex-1', errors.price && 'border-red-500')}
                    />
                  </div>
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price}</p>
                  )}

                  {/* Negotiable */}
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={formData.negotiable}
                      onCheckedChange={checked =>
                        setFormData(prev => ({ ...prev, negotiable: checked }))
                      }
                      id="negotiable"
                    />
                    <Label htmlFor="negotiable" className="text-sm">
                      Price is negotiable
                    </Label>
                  </div>
                </div>

                {/* Brand (optional) */}
                <div className="space-y-2">
                  <Label>Brand (optional)</Label>
                  <Input
                    value={formData.brand}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, brand: e.target.value }))
                    }
                    placeholder="e.g., Apple, Nike, IKEA"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe your item in detail..."
                    rows={4}
                  />
                </div>

                {/* Next Button */}
                <Button
                  onClick={handleNext}
                  className="w-full h-11"
                  disabled={!formData.title || !formData.category || !formData.price}
                >
                  Continue
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" />
                    Photos ({formData.images.length}/10)
                  </Label>

                  {/* Image Preview */}
                  {formData.images.length > 0 && (
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                      <img
                        src={formData.images[currentImageIndex]}
                        alt={`Photo ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain"
                      />

                      {/* Navigation */}
                      {formData.images.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setCurrentImageIndex(i =>
                                i > 0 ? i - 1 : formData.images.length - 1
                              )
                            }
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
                          >
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                          <button
                            onClick={() =>
                              setCurrentImageIndex(i =>
                                i < formData.images.length - 1 ? i + 1 : 0
                              )
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
                          >
                            <ChevronRight className="w-5 h-5 text-white" />
                          </button>
                        </>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => removeImage(currentImageIndex)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>

                      {/* Image indicators */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {formData.images.map((_, i) => (
                          <div
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={cn(
                              'w-2 h-2 rounded-full cursor-pointer transition-colors',
                              i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thumbnails */}
                  {formData.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formData.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={cn(
                            'w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors',
                            i === currentImageIndex
                              ? 'border-blue-500'
                              : 'border-transparent'
                          )}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                      errors.images ? 'border-red-500' : 'border-gray-300',
                      'hover:border-gray-400'
                    )}
                  >
                    <ImagePlus className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="font-medium">Add Photos</p>
                    <p className="text-sm text-gray-500">
                      or drag and drop images here
                    </p>
                  </button>
                  {errors.images && (
                    <p className="text-sm text-red-500">{errors.images}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input
                    value={formData.location}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="Enter your location"
                    className={cn(errors.location && 'border-red-500')}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location}</p>
                  )}
                </div>

                {/* City, State, Country */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, state: e.target.value }))
                      }
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={formData.country}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, country: e.target.value }))
                      }
                      placeholder="Country"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold">Listing Summary</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{formData.category}</Badge>
                    <Badge>{CONDITIONS.find(c => c.value === formData.condition)?.label}</Badge>
                    {formData.negotiable && <Badge variant="secondary">Negotiable</Badge>}
                  </div>
                  <p className="text-2xl font-bold">
                    {selectedCurrency?.symbol}
                    {parseFloat(formData.price).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">{formData.title}</p>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-full h-11"
                  disabled={isSubmitting || formData.images.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Listing...
                    </>
                  ) : (
                    'Post Listing'
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
