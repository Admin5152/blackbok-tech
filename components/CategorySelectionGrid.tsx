import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  imageUrl?: string;
  isSelected?: boolean;
  isFeatured?: boolean;
}

interface Props {
  items: CategoryItem[];
  breadcrumb: string;
  title: string;
  helpUrl?: string;
  helpText?: string;
  onBack?: () => void;
  onSelect: (item: CategoryItem) => void;
  isLight?: boolean;
}

export const CategorySelectionGrid: React.FC<Props> = ({
  items,
  breadcrumb,
  title,
  helpUrl,
  helpText = 'Help identify your model →',
  onBack,
  onSelect,
  isLight = false,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
            {breadcrumb}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#CDA032] transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          {helpUrl && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-black text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 transition-colors shrink-0 px-3 py-1.5 rounded-full bg-blue-500/10"
            >
              {helpText}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start pr-1">
        {items.map((item) => {
          const featured = item.isFeatured;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`relative flex flex-col items-center justify-center gap-3 p-4 pt-5 rounded-2xl border transition-all duration-200 group ${
                featured
                  ? 'bg-black border-[#CDA032]/30 hover:border-[#CDA032]/50 hover:shadow-[0_0_20px_rgba(205,160,50,0.2)]'
                  : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40 hover:shadow-[0_0_16px_rgba(205,160,50,0.1)]'
              } ${item.isSelected ? 'ring-2 ring-[#CDA032]' : ''}`}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className={`h-16 w-auto object-contain transition-all duration-200 ${
                    featured ? 'opacity-100' : 'opacity-60'
                  } group-hover:opacity-90 group-hover:scale-105`}
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-[#CDA032]/10 flex items-center justify-center">
                  <span className="text-2xl font-black text-[#CDA032]">
                    {item.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="text-center">
                <p className={`text-[13px] font-black ${featured ? 'text-white' : ''}`}>{item.name}</p>
                <p
                  className={`text-[9px] uppercase tracking-widest mt-1 transition-colors ${
                    featured
                      ? 'text-[#CDA032]/80'
                      : 'opacity-40 group-hover:text-[#CDA032] group-hover:opacity-100'
                  }`}
                >
                  Select Models
                </p>
              </div>
              {item.isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#CDA032] flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M1.5 4L3 5.5L6.5 2"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
