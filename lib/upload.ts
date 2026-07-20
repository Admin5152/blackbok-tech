import { supabase } from './supabase';

export const REPAIR_IMAGES_BUCKET = 'repair-images';

/**
 * Normalizes a stored repair image reference to a storage object path
 * `{user_id}/{file}` — supports legacy public URLs, signed URLs, or bare paths.
 */
export function repairImageObjectPathFromStored(stored: string): string | null {
  const s = stored.trim().split('?')[0];
  if (!s || s.includes('..')) return null;

  const pub = `/object/public/${REPAIR_IMAGES_BUCKET}/`;
  const pi = s.indexOf(pub);
  if (pi >= 0) {
    try {
      return decodeURIComponent(s.slice(pi + pub.length));
    } catch {
      return null;
    }
  }

  const sign = `/object/sign/${REPAIR_IMAGES_BUCKET}/`;
  const si = s.indexOf(sign);
  if (si >= 0) {
    const rest = s.slice(si + sign.length).split('?')[0];
    try {
      return decodeURIComponent(rest);
    } catch {
      return null;
    }
  }

  if (/^[0-9a-f-]{36}\/.+/i.test(s)) return s;
  return null;
}

/** Signed GET URL for private `repair-images` objects (honours storage RLS). */
export async function getSignedRepairImageUrl(
  stored: string,
  expiresIn = 3600,
): Promise<string | null> {
  const path = repairImageObjectPathFromStored(stored);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(REPAIR_IMAGES_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.warn('getSignedRepairImageUrl:', error?.message);
    return null;
  }
  return data.signedUrl;
}

export const uploadImage = async (file: File, bucket: string = REPAIR_IMAGES_BUCKET): Promise<string | null> => {
  try {
    if (!file) return null;

    if (file.size > (bucket === 'product-images' ? 10 : 5) * 1024 * 1024) {
      throw new Error(
        bucket === 'product-images'
          ? 'File size must be less than 10MB'
          : 'File size must be less than 5MB',
      );
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(
        bucket === 'product-images'
          ? 'Please sign in to upload product images.'
          : 'Please sign in to upload repair photos.',
      );
    }

    // Product images: prefer a flat public path so storefront URLs stay short.
    // Repair images stay under `{user_id}/…` for private RLS.
    const safeExt = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`;
    const filePath =
      bucket === 'product-images' ? `catalog/${fileName}` : `${user.id}/${fileName}`;

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

    if (error) {
      console.error('Upload error:', error);
      const msg = error.message || '';
      if (/bucket|not found|does not exist/i.test(msg)) {
        throw new Error(
          bucket === 'product-images'
            ? 'Product image storage is not set up yet. Run database/migrations/2026_07_product_images_storage_staff.sql in Supabase.'
            : 'Photo storage is not set up yet. Ask an admin to run the repair-images storage migrations in Supabase.',
        );
      }
      if (/row-level security|rls|not authorized|42501|policy/i.test(msg)) {
        throw new Error(
          bucket === 'product-images'
            ? 'Upload blocked by storage permissions. Run database/migrations/2026_07_product_images_storage_staff.sql in the Supabase SQL editor (fixes admin/staff uploads even when user_roles is out of sync).'
            : 'You do not have permission to upload this photo.',
        );
      }
      throw error;
    }

    // Private bucket: persist path in `repair_requests.image_urls`; UI uses signed URLs to display.
    if (bucket === REPAIR_IMAGES_BUCKET) {
      return filePath;
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

export const deleteImage = async (stored: string, bucket: string = REPAIR_IMAGES_BUCKET): Promise<void> => {
  try {
    let filePath: string | null = null;
    if (bucket === REPAIR_IMAGES_BUCKET) {
      filePath = repairImageObjectPathFromStored(stored);
    }
    if (!filePath) {
      const marker = `/object/public/${bucket}/`;
      const idx = stored.indexOf(marker);
      const raw =
        idx >= 0
          ? stored.slice(idx + marker.length).split('?')[0]
          : stored.split('/').slice(-2).join('/');
      filePath = decodeURIComponent(raw);
    }

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
      let { width, height } = img;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality,
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
