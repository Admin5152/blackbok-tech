import React, { useEffect, useId, useRef, useState } from 'react';

const OOS_TIP = 'Out of stock for this configuration';

type Props = {
  outOfStock: boolean;
  selected?: boolean;
  onSelect: () => void;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** Prefer swatch (round) tip placement */
  tipAlign?: 'center' | 'start';
};

/**
 * Option chip that stays tappable when OOS so we can show a pop tip
 * (native `disabled` blocks mobile taps).
 */
export const StockAwareOptionButton: React.FC<Props> = ({
  outOfStock,
  selected = false,
  onSelect,
  label,
  className = '',
  style,
  children,
  tipAlign = 'center',
}) => {
  const [tip, setTip] = useState(false);
  const tipId = useId();
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const showTip = () => {
    setTip(true);
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setTip(false), 2200);
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-pressed={selected}
        aria-disabled={outOfStock}
        aria-describedby={tip ? tipId : undefined}
        title={outOfStock ? `${label} — ${OOS_TIP}` : label}
        onClick={() => {
          if (outOfStock) {
            showTip();
            return;
          }
          onSelect();
        }}
        className={className}
        style={style}
      >
        {children}
        {outOfStock ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <span className="block h-px w-[120%] rotate-[-28deg] bg-current opacity-50" />
          </span>
        ) : null}
      </button>
      {tip ? (
        <span
          id={tipId}
          role="status"
          className={`absolute z-30 bottom-[calc(100%+6px)] whitespace-nowrap rounded-md bg-black px-2 py-1 text-[10px] font-bold text-white shadow-lg ${
            tipAlign === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {OOS_TIP}
          <span
            className={`absolute top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-black ${
              tipAlign === 'start' ? 'left-3' : 'left-1/2 -translate-x-1/2'
            }`}
            aria-hidden
          />
        </span>
      ) : null}
    </span>
  );
};
