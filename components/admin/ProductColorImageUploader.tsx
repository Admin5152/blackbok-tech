import React, { useRef } from 'react';
import { Upload, Link2 } from 'lucide-react';

type Props = {
  colors: string[];
  colorImages: Record<string, string>;
  busy?: boolean;
  isLight?: boolean;
  onUpload: (color: string, file: File) => void | Promise<void>;
  onUrlChange: (color: string, url: string) => void;
};

export const ProductColorImageUploader: React.FC<Props> = ({
  colors,
  colorImages,
  busy = false,
  isLight = false,
  onUpload,
  onUrlChange,
}) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!colors.length) return null;

  const card = isLight
    ? 'border-black/10 bg-white'
    : 'border-white/10 bg-black/30';
  const muted = isLight ? 'text-black/50' : 'text-white/45';
  const inputCls = isLight
    ? 'w-full bg-black/[0.04] border border-black/10 rounded-lg px-2 py-1.5 text-black text-xs'
    : 'w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs';

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${card}`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">
          Colour photos
        </p>
        <p className={`text-[11px] mt-1 leading-relaxed ${muted}`}>
          Upload one photo per colour. Shoppers see it when they pick that colour on the product page and in trade-in.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {colors.map((color) => {
          const url = colorImages[color] ?? '';
          return (
            <div key={color} className={`rounded-xl border p-3 space-y-2 ${isLight ? 'border-black/8' : 'border-white/8'}`}>
              <p className="text-xs font-bold truncate">{color}</p>
              <div className={`aspect-square rounded-lg overflow-hidden flex items-center justify-center ${isLight ? 'bg-black/[0.03]' : 'bg-white/5'}`}>
                {url ? (
                  <img src={url} alt={color} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>No photo</span>
                )}
              </div>
              <label
                className={`inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#B38B21] text-black text-[9px] font-black uppercase cursor-pointer hover:bg-[#D4AF37] transition-colors ${
                  busy ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload size={12} />
                Upload
                <input
                  ref={(el) => {
                    inputRefs.current[color] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload(color, file);
                    e.target.value = '';
                  }}
                />
              </label>
              <div className="flex gap-1.5">
                <Link2 size={12} className={`shrink-0 mt-2 ${muted}`} />
                <input
                  type="url"
                  placeholder="Or paste image URL"
                  value={url}
                  onChange={(e) => onUrlChange(color, e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
