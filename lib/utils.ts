
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
