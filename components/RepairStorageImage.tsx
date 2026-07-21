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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!stored) {
      setSrc(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    getSignedRepairImageUrl(stored, expiresIn).then((u) => {
      if (cancelled) return;
      if (u) setSrc(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [stored, expiresIn]);

  if (!stored) return null;

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-white/5 text-[10px] text-white/40 px-2 text-center ${className}`}
      >
        Photo unavailable
      </div>
    );
  }

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
