
/** Ghana Cedis — explicit GH₵ prefix for storefront + admin (Section 18). */
export const formatCurrency = (amount: number) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'GH₵0';
  const formatted = n.toLocaleString('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `GH₵${formatted}`;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

/** When `html` has class `dark` — inset highlight + cast shadow for tactile controls. */
export const TW_DARK_BTN_DEPTH =
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_8px_26px_-6px_rgba(0,0,0,0.82),0_2px_8px_-2px_rgba(0,0,0,0.52)]';

/** Gold / primary fills on dark — slightly brighter top edge + warmer ambient shadow. */
export const TW_DARK_GOLD_BTN_DEPTH =
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_34px_-8px_rgba(0,0,0,0.65),0_4px_18px_-4px_rgba(212,175,55,0.32)]';
