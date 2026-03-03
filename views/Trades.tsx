import React, { useState, useMemo, useRef } from 'react';
import { RefreshCcw, Smartphone, ArrowRight, Zap, ShieldCheck, Check, Sparkles, Scale, Info, Search, TrendingUp, Award, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { ProductCard } from '../components/ProductCard';

interface TradesProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
  notify: (msg: string) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
}

export const Trades: React.FC<TradesProps> = ({
  products, onAddToCart, notify, onQuickView, wishlist, toggleWishlist, compareIds, onToggleCompare
}) => {
  const [currentPhone, setCurrentPhone] = useState('');
  const [condition, setCondition] = useState('excellent');
  const [targetPhoneId, setTargetPhoneId] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [targetColor, setTargetColor] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const yourDeviceRef = useRef<HTMLElement | null>(null);
  const newDeviceRef = useRef<HTMLElement | null>(null);

  const targetPhones = useMemo(() =>
    products.filter(p =>
      p.category === 'iPhone' &&
      (targetSearch === '' || p.name.toLowerCase().includes(targetSearch.toLowerCase()))
    ), [products, targetSearch]);

  const relatedHardware = useMemo(() =>
    products.filter(p => p.category === 'Accessories' || p.category === 'Audio').slice(0, 4),
    [products]);

  const valuations: Record<string, number> = {
    'iPhone 11': 1500, 'iPhone 12': 2500, 'iPhone 13': 3500,
    'iPhone 14': 5000, 'iPhone 15': 6500,
  };

  const conditionMultiplier: Record<string, number> = {
    excellent: 1.0, good: 0.85, fair: 0.6, poor: 0.3,
  };

  const conditionLabels: Record<string, { label: string; desc: string; dot: string }> = {
    excellent: { label: 'Excellent', desc: 'Zero faults · Pristine', dot: 'bg-emerald-400' },
    good: { label: 'Good', desc: 'Light wear · Functional', dot: 'bg-blue-400' },
    fair: { label: 'Fair', desc: 'Scratched · Works fine', dot: 'bg-amber-400' },
    poor: { label: 'Poor', desc: 'Cracked · Needs repair', dot: 'bg-red-400' },
  };

  const tradeInValue = useMemo(() => {
    if (!currentPhone) return 0;
    return (valuations[currentPhone] || 1000) * conditionMultiplier[condition];
  }, [currentPhone, condition]);

  const targetPhone = useMemo(() => targetPhones.find(p => p.id === targetPhoneId), [targetPhoneId, targetPhones]);
  const difference = targetPhone ? Math.max(0, targetPhone.price - tradeInValue) : 0;
  const savingsPct = targetPhone ? Math.round((tradeInValue / targetPhone.price) * 100) : 0;

  return (
    <div className="min-h-screen no-print relative" style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-text)' }}>

      {/* Subtle bg glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #B38B21 0%, transparent 70%)', filter: 'blur(120px)', transform: 'translate(40%, -40%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #B38B21 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translate(-40%, 40%)' }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-10 pb-32 sm:pb-36 xl:pb-10 relative z-10 space-y-10 sm:space-y-12">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--bb-border)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#B38B21' }}>
                <RefreshCcw size={20} className="text-black" style={{ animation: 'spin 8s linear infinite' }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-60">Trade In Console</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-none">Trade In</h1>
            <p className="text-sm opacity-60 font-medium mt-2 max-w-md">Upgrade your tech by trading in your current devices. Get the best market value instantly.</p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />, label: 'Data Wiped Securely' },
              { icon: <Award size={14} style={{ color: '#B38B21' }} />, label: 'Best Price Guarantee' },
              { icon: <Zap size={14} className="text-amber-500 dark:text-amber-400" />, label: 'Same Day Processing' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/5 dark:border-white/5 bg-[var(--bb-surface-2)] shadow-sm">
                {b.icon}
                <span className="text-[11px] font-bold tracking-wide opacity-70 uppercase">{b.label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

          {/* Left: Steps */}
          <div className="xl:col-span-8 space-y-8">

            {/* Step 1 */}
            <section
              ref={yourDeviceRef as any}
              className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden"
            >
              {/* Corner Marks */}
              <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#B38B21]/50" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#B38B21]/50" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#B38B21]/50" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#B38B21]/50" />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg text-[10px] font-black text-black flex items-center justify-center" style={{ backgroundColor: '#B38B21' }}>01</span>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white/80">Your Device</h2>
                  </div>
                  <span className="hidden md:inline text-[10px] text-white/40 uppercase tracking-[0.25em]">
                    Start here · Choose what you&apos;re trading in
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Model select with search */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                      <Smartphone size={11} style={{ color: '#B38B21' }} /> Model
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search and select your device..."
                        value={currentPhone}
                        onChange={e => {
                          setCurrentPhone(e.target.value);
                          setCurrentSearch(e.target.value);
                        }}
                        className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none transition-all focus:border-white/40 pl-10"
                        style={{ backgroundColor: 'var(--bb-bg)' }}
                      />
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />

                      {currentSearch && (
                        <div className="absolute z-20 w-full mt-1 border border-white/10 rounded-xl shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: 'var(--bb-surface)' }}>
                          {Object.keys(valuations)
                            .filter(v => v.toLowerCase().includes(currentSearch.toLowerCase()))
                            .slice(0, 6)
                            .map(v => (
                              <button
                                key={v}
                                onClick={() => {
                                  setCurrentPhone(v);
                                  setCurrentSearch('');
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                              >
                                {v}
                              </button>
                            ))}
                          <button
                            onClick={() => {
                              setCurrentPhone('Other Apple Device');
                              setCurrentSearch('');
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition-colors border-t border-white/5"
                          >
                            Other Apple Device
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#B38B21' }} /> Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Black', 'White', 'Red', 'Blue', 'Green', 'Purple', 'Pink', 'Gold', 'Silver'].map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${selectedColor === color
                            ? 'border-[#B38B21] bg-[#B38B21]/20 text-[#B38B21]'
                            : 'border-white/10 hover:border-white/20 text-white/60'
                            }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full border-2"
                            style={{
                              backgroundColor: color.toLowerCase() === 'black' ? '#000' :
                                color.toLowerCase() === 'white' ? '#fff' :
                                  color.toLowerCase() === 'red' ? '#ef4444' :
                                    color.toLowerCase() === 'blue' ? '#3b82f6' :
                                      color.toLowerCase() === 'green' ? '#10b981' :
                                        color.toLowerCase() === 'purple' ? '#a855f7' :
                                          color.toLowerCase() === 'pink' ? '#ec4899' :
                                            color.toLowerCase() === 'gold' ? '#f59e0b' :
                                              color.toLowerCase() === 'silver' ? '#9ca3af' :
                                                '#6b7280',
                              borderColor: selectedColor === color ? '#B38B21' : 'rgba(255,255,255,0.3)'
                            }}
                          />
                          <span className="text-xs">{color}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                      <Scale size={11} style={{ color: '#B38B21' }} /> Condition
                    </label>
                    <div className="space-y-1.5">
                      {Object.entries(conditionLabels).map(([key, { label, desc, dot }]) => (
                        <button
                          key={key}
                          onClick={() => setCondition(key)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between
                          ${condition === key
                              ? 'border-white/40 bg-white/10'
                              : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                            <span className="text-xs font-semibold text-white/70">{label}</span>
                            <span className="text-[10px] text-white/60 hidden sm:block">— {desc}</span>
                          </div>
                          {condition === key && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#B38B21' }}>
                              <Check size={10} className="text-black" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Valuation row */}
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-[var(--bb-border)]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-50 mb-1">Estimated Value</p>
                    <p className="text-3xl md:text-4xl font-black tracking-tighter" style={{ color: '#B38B21' }}>
                      {formatCurrency(tradeInValue)}
                    </p>
                  </div>
                  {currentPhone && (
                    <span className="text-xs font-bold px-4 py-2 rounded-xl bg-[#B38B21]/10 text-[#B38B21]">
                      {Math.round(conditionMultiplier[condition] * 100)}% of base value
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Step 2 */}
            <section ref={newDeviceRef as any} className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden">
              {/* Corner Marks */}
              <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#B38B21]/50" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#B38B21]/50" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#B38B21]/50" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#B38B21]/50" />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md" style={{ backgroundColor: '#B38B21' }}>02</span>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Select New Device</h2>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
                    <input
                      placeholder="Search..."
                      value={targetSearch}
                      onChange={e => setTargetSearch(e.target.value)}
                      className="w-full border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-white outline-none transition-all focus:border-white/40"
                      style={{ backgroundColor: 'var(--bb-surface)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {targetPhones.length > 0 ? targetPhones.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setTargetPhoneId(p.id)}
                      className="relative rounded-2xl border cursor-pointer transition-all duration-300 p-4 flex flex-col items-center gap-3 text-center group overflow-hidden"
                      style={{
                        backgroundColor: targetPhoneId === p.id ? 'rgba(179,139,33,0.1)' : 'var(--bb-surface)',
                        borderColor: targetPhoneId === p.id ? 'rgba(179,139,33,0.5)' : 'rgba(255,255,255,0.15)',
                        boxShadow: targetPhoneId === p.id ? '0 0 20px rgba(179,139,33,0.12)' : 'none',
                      }}
                    >
                      {/* Corner Marks */}
                      <div className="pointer-events-none absolute inset-0 z-0">
                        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 rounded-tl-xl transition-colors border-[#B38B21]/40" />
                        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 rounded-tr-xl transition-colors border-[#B38B21]/40" />
                        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 rounded-bl-xl transition-colors border-[#B38B21]/40" />
                        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 rounded-br-xl transition-colors border-[#B38B21]/40" />
                      </div>
                      {targetPhoneId === p.id && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: '#B38B21' }}>
                          <Check size={10} className="text-black" strokeWidth={3} />
                        </div>
                      )}
                      <div className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--bb-bg)' }}>
                        <img src={p.image} alt={p.name} className="w-16 h-16 object-contain transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{p.category}</p>
                        <h4 className="text-xs font-bold text-white leading-tight">{p.name}</h4>
                        <p className="text-sm font-black text-white">{formatCurrency(p.price)}</p>
                      </div>
                      {p.specs && p.specs.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1">
                          {p.specs.slice(0, 2).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-semibold text-white/60 bg-white/5">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="col-span-full py-16 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--bb-surface)' }}>
                      <Info size={32} className="text-white/20" />
                      <p className="text-xs font-semibold text-white/50">No devices match your search</p>
                      <button onClick={() => setTargetSearch('')} className="text-[10px] opacity-60 hover:opacity-100 transition-colors underline">Clear search</button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Target Phone Color Selection */}
            {targetPhone && (
              <section className="relative rounded-[2.5rem] p-6 md:p-10 space-y-6 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden">
                {/* Corner Marks */}
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#B38B21]/50" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#B38B21]/50" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#B38B21]/50" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#B38B21]/50" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md" style={{ backgroundColor: '#B38B21' }}>03</span>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Choose Color</h2>
                  </div>
                  <p className="text-xs opacity-70">Select your preferred color for the new device</p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {['Black', 'White', 'Red', 'Blue', 'Green', 'Purple', 'Pink', 'Gold', 'Silver'].map(color => (
                      <button
                        key={color}
                        onClick={() => setTargetColor(color)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${targetColor === color
                          ? 'border-[#B38B21] bg-[#B38B21]/20 text-[#B38B21]'
                          : 'border-white/10 hover:border-white/20 text-white/60'
                          }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2"
                          style={{
                            backgroundColor: color.toLowerCase() === 'black' ? '#000' :
                              color.toLowerCase() === 'white' ? '#fff' :
                                color.toLowerCase() === 'red' ? '#ef4444' :
                                  color.toLowerCase() === 'blue' ? '#3b82f6' :
                                    color.toLowerCase() === 'green' ? '#10b981' :
                                      color.toLowerCase() === 'purple' ? '#a855f7' :
                                        color.toLowerCase() === 'pink' ? '#ec4899' :
                                          color.toLowerCase() === 'gold' ? '#f59e0b' :
                                            color.toLowerCase() === 'silver' ? '#9ca3af' :
                                              '#6b7280',
                            borderColor: targetColor === color ? '#B38B21' : 'rgba(255,255,255,0.3)'
                          }}
                        />
                        <span className="text-xs">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden xl:block xl:col-span-4">
            <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-auto pr-1">
              <div className="rounded-[2.5rem] p-8 space-y-6 border border-[var(--bb-border)] glow-surface shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest opacity-50 flex items-center gap-2 border-b border-[var(--bb-border)] pb-4">
                  <Scale size={16} style={{ color: '#B38B21' }} /> Trade Summary
                </h3>

                {/* Visual comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative rounded-2xl p-4 space-y-3 text-center border border-[var(--bb-border)] bg-[var(--bb-surface-2)] shadow-inner overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 z-0">
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 rounded-tl-md transition-colors border-[#B38B21]/40" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 rounded-tr-md transition-colors border-[#B38B21]/40" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 rounded-bl-md transition-colors border-[#B38B21]/40" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 rounded-br-md transition-colors border-[#B38B21]/40" />
                    </div>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest relative z-10">Your Device</p>
                    <div className="h-14 flex items-center justify-center relative z-10">
                      {currentPhone
                        ? <p className="text-xs font-bold">{currentPhone}</p>
                        : <p className="text-[9px] opacity-20">—</p>
                      }
                    </div>
                    <p className="text-base font-black relative z-10" style={{ color: '#B38B21' }}>{formatCurrency(tradeInValue)}</p>
                  </div>

                  <div className="relative rounded-2xl p-4 space-y-3 text-center border border-[var(--bb-border)] bg-[var(--bb-surface-2)] shadow-inner overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 z-0">
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 rounded-tl-md transition-colors border-[#B38B21]/40" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 rounded-tr-md transition-colors border-[#B38B21]/40" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 rounded-bl-md transition-colors border-[#B38B21]/40" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 rounded-br-md transition-colors border-[#B38B21]/40" />
                    </div>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest relative z-10">New Device</p>
                    <div className="h-14 flex items-center justify-center overflow-hidden relative z-10">
                      {targetPhone
                        ? <img src={targetPhone.image} alt="" className="h-12 w-12 object-contain drop-shadow-md" />
                        : <p className="text-[9px] opacity-20">—</p>
                      }
                    </div>
                    <p className="text-base font-black">{targetPhone ? formatCurrency(targetPhone.price) : '—'}</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-3 pt-4 border-t border-[var(--bb-border)]">
                  {[
                    { label: 'Trade-in credit', value: formatCurrency(tradeInValue), color: 'text-emerald-500 font-bold' },
                    { label: 'Device price', value: targetPhone ? formatCurrency(targetPhone.price) : '—', color: 'opacity-50' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm opacity-60 font-medium">{row.label}</span>
                      <span className={`text-sm ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                  <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold opacity-50">Balance Due</span>
                    <span className="text-xl font-black" style={{ color: '#B38B21' }}>{formatCurrency(difference)}</span>
                  </div>
                  {targetPhone && savingsPct > 0 && (
                    <div className="flex items-center gap-1.5 pt-2">
                      <Sparkles size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-500">Save {savingsPct}% with trade-in!</span>
                    </div>
                  )}
                </div>

                {/* Final amount */}
                <div className="text-center py-6 border-t border-b border-[var(--bb-border)] mt-4 bg-[var(--bb-surface-2)] -mx-8 px-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Final Payment</p>
                  <p className="text-5xl font-black tracking-tighter" style={{ color: '#B38B21' }}>{formatCurrency(difference)}</p>
                  <p className="text-[10px] opacity-30 mt-2 font-medium">Inc. VAT (12.5%)</p>

                  {/* CTA */}
                  <button
                    disabled={!targetPhoneId || !currentPhone}
                    onClick={() => setShowReviewDialog(true)}
                    className="w-full mt-6 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-black flex items-center justify-center gap-3 transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 shadow-[0_10px_30px_rgba(179,139,33,0.3)]"
                    style={{ backgroundColor: '#B38B21' }}
                  >
                    Confirm Trade
                    <ArrowRight size={18} />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-white/20">
                    <ShieldCheck size={12} style={{ color: '#B38B21' }} />
                    <span className="text-[10px] font-medium">Precision Exchange Program</span>
                  </div>
                </div>
              </div>

              {/* Guarantee card */}
              <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: 'rgba(179,139,33,0.04)', borderLeft: '2px solid rgba(179,139,33,0.15)' }}>
                <div className="flex items-center gap-2">
                  <Award size={15} style={{ color: '#B38B21' }} />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white/70">Best Value Guarantee</h4>
                </div>
                <p className="text-[10px] text-white/60 leading-relaxed">
                  Find a better offer within 48 hours and we'll match it plus 10%.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Related Products ── */}
        <section className="pt-8 space-y-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Upgrade Essentials</h2>
              <p className="text-[10px] text-white/60 mt-1 uppercase tracking-widest">Complete your new kit</p>
            </div>
            <Link to="/store" className="text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors flex items-center gap-2 group">
              View All <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {relatedHardware.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onQuickView={onQuickView}
                isWishlisted={wishlist.includes(p.id)}
                onToggleWishlist={toggleWishlist}
                onAddToCart={onAddToCart}
                isCompared={compareIds.includes(p.id)}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Mobile bottom confirm bar (replaces summary at page bottom) */}
      <div
        className="xl:hidden fixed bottom-0 left-0 right-0 z-[120] border-t border-white/10 backdrop-blur-xl"
        style={{ backgroundColor: 'var(--bb-surface)' }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Final payment</p>
            <p className="text-xl font-black truncate" style={{ color: '#B38B21' }}>{formatCurrency(difference)}</p>
          </div>
          <button
            disabled={!targetPhoneId || !currentPhone}
            onClick={() => setShowReviewDialog(true)}
            className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-black flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#B38B21' }}
          >
            Review & Confirm
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Review & Confirm dialog (with edit actions) */}
      {showReviewDialog && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full mx-auto shadow-2xl" style={{ backgroundColor: 'var(--bb-surface)' }}>
            <div className="mb-6">
              <h3 className="text-2xl font-black text-white mb-1">Review your trade</h3>
              <p className="text-sm text-white/60">Confirm the details below, or edit them before finalizing.</p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Visual snapshot of both devices */}
              <div className="rounded-2xl border border-white/10 p-4 mb-2" style={{ backgroundColor: 'var(--bb-bg)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">
                      Trading In
                    </p>
                    <div className="mx-auto mb-2 w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center text-xs text-white/60">
                      {currentPhone || 'Your device'}
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-white/30" />
                  <div className="flex-1 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-2">
                      Getting
                    </p>
                    <div className="mx-auto mb-2 w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden bg-black/40">
                      {targetPhone ? (
                        <img
                          src={targetPhone.image}
                          alt={targetPhone.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-white/40">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4" style={{ backgroundColor: 'var(--bb-bg)' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Your device</p>
                  <button
                    onClick={() => {
                      setShowReviewDialog(false);
                      yourDeviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] hover:opacity-80"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Model</span>
                    <span className="text-xs font-semibold text-white">{currentPhone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Color</span>
                    <span className="text-xs font-semibold text-white">{selectedColor || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Condition</span>
                    <span className="text-xs font-semibold text-white">{conditionLabels[condition]?.label || condition}</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/50">Trade-in credit</span>
                    <span className="text-xs font-black" style={{ color: '#B38B21' }}>{formatCurrency(tradeInValue)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4" style={{ backgroundColor: 'var(--bb-bg)' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">New device</p>
                  <button
                    onClick={() => {
                      setShowReviewDialog(false);
                      newDeviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] hover:opacity-80"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Model</span>
                    <span className="text-xs font-semibold text-white">{targetPhone?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Color</span>
                    <span className="text-xs font-semibold text-white">{targetColor || '—'}</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/50">Final payment</span>
                    <span className="text-base font-black text-white">{formatCurrency(difference)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewDialog(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl text-sm font-semibold transition-all hover:bg-white/20"
              >
                Back
              </button>
              <button
                disabled={!targetPhoneId || !currentPhone}
                onClick={() => {
                  setShowReviewDialog(false);
                  setShowSuccessPopup(true);
                }}
                className="flex-1 py-3 bg-[#B38B21] text-black rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Confirm trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-white/10 rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl" style={{ backgroundColor: 'var(--bb-surface)' }}>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#B38B21]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-[#B38B21]" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Trade-In Confirmed!</h3>
              <p className="text-sm text-white/70">Your trade-in reservation has been successfully initiated</p>
            </div>

            {/* Trade Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-sm text-white/70">Device Trading In</span>
                <span className="text-sm font-semibold text-white">{currentPhone}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-sm text-white/40">Device Getting</span>
                <span className="text-sm font-semibold text-white">{targetPhone?.name || 'Selected Device'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-sm text-white/40">Trade-In Value</span>
                <span className="text-sm font-semibold text-[#B38B21]">{formatCurrency(tradeInValue)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-white/40">Final Payment</span>
                <span className="text-lg font-black text-white">{formatCurrency(difference)}</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-[#B38B21]/5 border border-[#B38B21]/20 rounded-xl p-4 mb-6">
              <h4 className="text-sm font-semibold text-[#B38B21] mb-2">Next Steps</h4>
              <ul className="space-y-1 text-xs text-white/50">
                <li>• Diagnostic appointment scheduled within 24hrs</li>
                <li>• Bring your device and original packaging</li>
                <li>• Receive instant credit upon approval</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessPopup(false);
                  notify('Trade-in reservation initiated. Diagnostic appointment scheduled.');
                }}
                className="flex-1 py-3 bg-[#B38B21] text-black rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105"
              >
                Got it
              </button>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl text-sm font-semibold transition-all hover:bg-white/20"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};