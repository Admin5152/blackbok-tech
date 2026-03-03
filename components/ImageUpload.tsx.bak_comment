import React, { useState, useRef } from 'react';
import { Upload, X, Camera, AlertCircle, Check } from 'lucide-react';
import { uploadImage, compressImage } from '../lib/upload';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSize?: number; // in MB
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  maxSize = 5,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    if (files.length === 0) return;

    // Check if adding these files would exceed max images
    if (images.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const newImages: string[] = [];

      for (const file of files) {
        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`File ${file.name} is larger than ${maxSize}MB`);
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Compress image
        const compressedFile = await compressImage(file);
        
        // Upload image
        const imageUrl = await uploadImage(compressedFile, 'repair-images');
        
        if (imageUrl) {
          newImages.push(imageUrl);
        }
      }

      onImagesChange([...images, ...newImages]);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          
          <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-[#B38B21]/40 transition-all cursor-pointer bg-black/20">
            {uploading ? (
              <div className="space-y-3">
                <div className="w-12 h-12 border-2 border-[#B38B21] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-medium text-white/60">Uploading images...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 mx-auto text-white/40" />
                <div>
                  <p className="text-sm font-medium text-white/60">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    PNG, JPG, GIF up to {maxSize}MB each (max {maxImages} images)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <img
                  src={imageUrl}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Remove Button */}
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Success Indicator */}
              <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
          ))}
          
          {/* Add More Button */}
          {images.length < maxImages && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-white/20 bg-black/20 hover:border-[#B38B21]/40 transition-all flex flex-col items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white/40 mb-1" />
              <span className="text-xs text-white/40">Add More</span>
            </button>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="space-y-2">
        <p className="text-xs text-white/30">
          • Upload clear photos of the device and the issue
        </p>
        <p className="text-xs text-white/30">
          • Include multiple angles if possible
        </p>
        <p className="text-xs text-white/30">
          • Images will help our technicians diagnose the problem faster
        </p>
      </div>
    </div>
  );
};
