import { supabase } from './supabase';

export const uploadImage = async (file: File, bucket: string = 'repair-images'): Promise<string | null> => {
  try {
    // Validate file
    if (!file) return null;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please sign in to upload repair photos.');
    }

    // Scoped path — must match storage RLS (see database/migrations/2026_05_storage_repair_images_bucket.sql)
    const safeExt = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('Upload error:', error);
      const msg = error.message || '';
      if (/bucket|not found|does not exist/i.test(msg)) {
        throw new Error(
          'Photo storage is not set up yet. Ask an admin to run the migration `2026_05_storage_repair_images_bucket.sql` in Supabase (creates the repair-images bucket).',
        );
      }
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const deleteImage = async (url: string, bucket: string = 'repair-images'): Promise<void> => {
  try {
    const marker = `/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    const raw =
      idx >= 0
        ? url.slice(idx + marker.length).split('?')[0]
        : url.split('/').slice(-2).join('/');
    const filePath = decodeURIComponent(raw);

    if (!filePath || filePath.includes('..')) {
      throw new Error('Invalid storage URL');
    }

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
