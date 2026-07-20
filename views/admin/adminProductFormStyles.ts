/** Shared class strings for admin product form UI (dark + light admin theme) */

export type AdminProductFormStyles = {
  label: string;
  input: string;
  card: string;
  tabActive: string;
  tabIdle: string;
  headerBg: string;
  headerBorder: string;
  title: string;
  muted: string;
  asideBg: string;
  asideBorder: string;
  previewCard: string;
  chip: string;
  errorBox: string;
};

const dark: AdminProductFormStyles = {
  label: 'text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] block mb-1.5',
  input:
    'w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[#F5F5F5] text-sm focus:border-[#B38B21]/50 focus:outline-none placeholder:text-[#737373]',
  card: 'rounded-2xl border border-white/10 bg-[#0a0a0a]/80 p-4 sm:p-5',
  tabActive: 'bg-[#B38B21] text-black shadow-lg shadow-[#B38B21]/20',
  tabIdle: 'bg-white/5 text-[#D4D4D4] hover:text-[#F5F5F5] hover:bg-white/10 border border-white/10',
  headerBg: 'bg-[#0d0d0d]/95',
  headerBorder: 'border-white/10',
  title: 'text-[#F5F5F5]',
  muted: 'text-[#A3A3A3]',
  asideBg: 'bg-[#080808]',
  asideBorder: 'border-white/10',
  previewCard: 'border-white/10 bg-black/50',
  chip: 'bg-[#B38B21]/10 border-[#B38B21]/25 text-[#D4AF37]',
  errorBox: 'bg-red-500/10 border-red-500/20 text-red-400',
};

const light: AdminProductFormStyles = {
  label: 'text-[9px] font-black uppercase tracking-widest text-black/60 block mb-1.5',
  input:
    'w-full bg-white border border-black/12 rounded-xl px-3 py-2.5 text-black text-sm focus:border-[#B38B21]/60 focus:outline-none focus:ring-1 focus:ring-[#B38B21]/25 placeholder:text-black/40',
  card: 'rounded-2xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm',
  tabActive: 'bg-[#B38B21] text-black shadow-md shadow-[#B38B21]/25',
  tabIdle: 'bg-black/[0.04] text-black/65 hover:text-black hover:bg-black/[0.07] border border-black/10',
  headerBg: 'bg-white/95',
  headerBorder: 'border-black/10',
  title: 'text-black',
  muted: 'text-black/55',
  asideBg: 'bg-[#f5f5f5]',
  asideBorder: 'border-black/10',
  previewCard: 'border-black/10 bg-white shadow-sm',
  chip: 'bg-[#B38B21]/12 border-[#B38B21]/30 text-[#8a6a12]',
  errorBox: 'bg-red-50 border-red-200 text-red-700',
};

/** @deprecated use getApf(isLight) */
export const apf = dark;

export function getApf(isLight: boolean): AdminProductFormStyles {
  return isLight ? light : dark;
}
