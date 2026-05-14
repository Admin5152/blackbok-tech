import React, { useEffect, useState } from 'react';
import { getSignedRepairImageUrl } from '../lib/upload';

type Props = {
  stored: string;
  alt: string;
  className?: string;
  /** Seconds — keep below typical session length; refreshed when `stored` changes. */
  expiresIn?: number;
};

/**
 * Renders a repair bucket image using a short-lived signed URL (private bucket + RLS).
 */
export const RepairStorageImage: React.FC<Props> = ({
  stored,
  alt,
  className = '',
  expiresIn = 3600,
}) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!stored) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    getSignedRepairImageUrl(stored, expiresIn).then((u) => {
      if (!cancelled) setSrc(u);
    });
    return () => {
      cancelled = true;
    };
  }, [stored, expiresIn]);

  if (!stored) return null;

  if (!src) {
    return (
      <div
        className={`animate-pulse rounded-xl bg-white/10 ${className}`}
        aria-hidden
      />
    );
  }

  return <img src={src} alt={alt} className={className} />;
};
