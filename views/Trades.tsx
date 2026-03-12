import React, { useState, useMemo } from 'react';
import {
  RefreshCcw, Smartphone, Laptop, Tablet, Gamepad2, Watch, MonitorSmartphone,
  ArrowRight, ArrowLeft, Check, Scale, Info, Search, Award, CheckCircle2,
  Zap, ShieldCheck, Sparkles, Send, User, Phone, Mail, MapPin, Calendar,
  Clock, Package, Activity, Wrench
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAppContext } from '../App';

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

const deviceTypes = [
  { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'laptop', label: 'Laptop', icon: Laptop },
  { id: 'gaming', label: 'Console', icon: Gamepad2 },
  { id: 'smartwatch', label: 'Watch', icon: Watch },
  { id: 'other', label: 'Other', icon: MonitorSmartphone },
];

const brands = ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Nintendo', 'HP', 'Dell', 'Lenovo', 'Other'];

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

const timeSlots = [
  { id: 'morning-1', time: '9:00 AM', label: 'Early Morning', available: true },
  { id: 'morning-2', time: '10:30 AM', label: 'Mid Morning', available: true },
  { id: 'afternoon-1', time: '12:00 PM', label: 'Noon', available: false },
  { id: 'afternoon-2', time: '2:00 PM', label: 'Early Afternoon', available: true },
  { id: 'afternoon-3', time: '3:30 PM', label: 'Mid Afternoon', available: true },
  { id: 'evening-1', time: '5:00 PM', label: 'Evening', available: true },
];

const APPLE_MODELS = ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15'];

export const Trades: React.FC<TradesProps> = ({
  products, onAddToCart, notify, onQuickView, wishlist, toggleWishlist, compareIds, onToggleCompare
}) => {
  const { user, theme } = useAppContext();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState(1); // 1=deviceType, 2=brand, 3=model
  const [transitionKey, setTransitionKey] = useState(0);

  const [formData, setFormData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    condition: 'excellent',
    targetPhoneId: '',
    notes: '',
    date: '',
    timeSlot: '',
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
  });

  const go = (n: number) => {
    setTransitionKey(k => k + 1);
    setStep(n);
    setSubStep(1);
  };

  const isApple = formData.brand === 'Apple';
  const modelOptions = isApple && formData.deviceType === 'smartphone' ? APPLE_MODELS : [];

  const tradeInValue = useMemo(() => {
    if (!formData.model) return 0;
    return (valuations[formData.model] || 800) * conditionMultiplier[formData.condition];
  }, [formData.model, formData.condition]);

  const targetPhone = useMemo(
    () => products.find(p => p.id === formData.targetPhoneId),
    [formData.targetPhoneId, products]
  );

  const targetPhones = useMemo(
    () => products.filter(p => p.category === 'iPhone'),
    [products]
  );

  const difference = targetPhone ? Math.max(0, targetPhone.price - tradeInValue) : 0;
  const savingsPct = targetPhone ? Math.round((tradeInValue / targetPhone.price) * 100) : 0;

  const submitTradeRequest = () => {
    if (!user) { navigate({ to: '/auth' }); return; }
    notify('Trade-in request submitted! We\'ll be in touch within 24 hours.');
    navigate({ to: '/profile' });
  };

  return (
    <div className="min-h-screen pb-32 relative" style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-text)' }}>

      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 60%)', filter: 'blur(100px)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translate(-30%, 30%)' }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-14 z-10 relative">

        {/* Header */}
        <header className="mb-10 sm:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#CDA032]/10 border border-[#CDA032]/30">
              <RefreshCcw size={20} className="text-[#CDA032]" />
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#CDA032]">BlackBox Trade-In Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[1.1]">
            Trade in. Upgrade<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CDA032] to-[#FCE69B]">without the hassle.</span>
          </h1>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* ── Main Form ── */}
          <div className="flex-1 w-full space-y-6">

            {/* STEP 1 — Your Device (sub-stepped) */}
            {step > 1 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Your Device</p>
                  <h3 className="text-xl font-black text-white">{formData.brand} {formData.model}</h3>
                </div>
                <button onClick={() => { setStep(1); setSubStep(1); }} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* 1a: Device Type */}
                {subStep > 1 ? (
                  <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">
                      {deviceTypes.find(d => d.id === formData.deviceType)?.label}
                    </h3>
                    <button onClick={() => setSubStep(1)} className="text-sm font-bold text-blue-500 hover:text-blue-400">Change</button>
                  </div>
                ) : subStep === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">What device are you trading in?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {deviceTypes.map(type => (
                        <button key={type.id}
                          onClick={() => {
                            setFormData({ ...formData, deviceType: type.id, brand: '', model: '' });
                            setSubStep(2);
                          }}
                          className={`flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${formData.deviceType === type.id
                            ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_30px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          <type.icon size={36} strokeWidth={1.5} className={`mb-4 transition-colors ${formData.deviceType === type.id ? 'text-[#CDA032]' : 'opacity-60'}`} />
                          <span className={`text-sm sm:text-base font-bold transition-colors ${formData.deviceType === type.id ? 'text-[#CDA032]' : 'opacity-90'}`}>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1b: Brand */}
                {subStep > 2 ? (
                  <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">{formData.brand}</h3>
                    <button onClick={() => setSubStep(2)} className="text-sm font-bold text-blue-500 hover:text-blue-400">Change</button>
                  </div>
                ) : subStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                        {deviceTypes.find(d => d.id === formData.deviceType)?.label}
                      </p>
                      <h2 className="text-2xl font-bold tracking-tight">Which brand?</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {brands.map(brand => (
                        <button key={brand}
                          onClick={() => {
                            setFormData({ ...formData, brand, model: '' });
                            setSubStep(3);
                          }}
                          className={`py-5 px-4 rounded-2xl border text-sm font-bold text-center transition-all duration-200 ${formData.brand === brand
                            ? 'bg-[#CDA032] text-black border-[#CDA032] shadow-lg shadow-[#CDA032]/20'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40 opacity-80'}`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1c: Model */}
                {subStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                        {deviceTypes.find(d => d.id === formData.deviceType)?.label} · {formData.brand}
                      </p>
                      <h2 className="text-2xl font-bold tracking-tight">Which model?</h2>
                    </div>

                    {modelOptions.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[...modelOptions].reverse().map(model => (
                          <button key={model}
                            onClick={() => setFormData(f => ({ ...f, model }))}
                            className={`py-5 px-4 rounded-2xl border text-sm font-bold text-center transition-all duration-200 ${formData.model === model
                              ? 'bg-[#CDA032]/10 border-[#CDA032] ring-1 ring-[#CDA032] text-[#CDA032]'
                              : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40 opacity-80'}`}
                          >
                            {model}
                            {formData.model === model && (
                              <span className="block text-[10px] mt-1 font-black uppercase tracking-widest text-[#CDA032]/70">
                                {formatCurrency((valuations[model] || 0) * conditionMultiplier[formData.condition])} value
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        placeholder={`Enter your ${formData.brand} model...`}
                        value={formData.model}
                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                        className="w-full max-w-md border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50"
                      />
                    )}

                    <button
                      onClick={() => {
                        if (!formData.model) { notify('Please select or enter your model.', 'error'); return; }
                        go(2);
                      }}
                      className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full max-w-md"
                    >
                      Continue <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — Condition & Target Device */}
            {step > 2 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Condition &amp; New Device</p>
                  <h3 className="text-xl font-black text-white capitalize">
                    {conditionLabels[formData.condition].label} · {targetPhone?.name || 'No device selected'}
                  </h3>
                </div>
                <button onClick={() => setStep(2)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 2 && (
              <div key={`step-2-${transitionKey}`} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">

                {/* Condition */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">What condition is your {formData.model || 'device'} in?</h2>
                    <p className="opacity-60 text-sm">Be honest — we'll inspect on arrival and adjust accordingly.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(conditionLabels).map(([key, { label, desc, dot }]) => {
                      const val = (valuations[formData.model] || 800) * conditionMultiplier[key];
                      const selected = formData.condition === key;
                      return (
                        <button key={key}
                          onClick={() => setFormData({ ...formData, condition: key })}
                          className={`flex flex-col text-left p-5 rounded-3xl border transition-all duration-300 ${selected
                            ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_20px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          <div className="flex justify-between w-full items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${dot}`} />
                              <span className={`font-extrabold text-base sm:text-lg ${selected ? 'text-[#CDA032]' : ''}`}>{label}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-2 ${selected ? 'border-[#CDA032] bg-[#CDA032]' : 'border-[var(--bb-border)] opacity-30'}`}>
                              {selected && <Check size={11} className="text-black" strokeWidth={4} />}
                            </div>
                          </div>
                          <span className="text-xs opacity-60 leading-relaxed mb-4">{desc}</span>
                          <div className="pt-4 border-t border-[var(--bb-border)]">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Estimated value: </span>
                            <span className="text-lg font-black text-[#CDA032] leading-none">{formatCurrency(val)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Value banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[#CDA032]/30 bg-[#CDA032]/5 animate-in fade-in duration-300">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Your Trade-In Value</p>
                      <p className="text-sm font-bold">{formData.model} · <span className="capitalize">{conditionLabels[formData.condition].label}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Credit Applied</p>
                      <p className="text-xl font-black text-[#CDA032]">{formatCurrency(tradeInValue)}</p>
                    </div>
                  </div>
                </div>

                {/* Select New Device */}
                <div className="space-y-4 pt-6 border-t border-[var(--bb-border)]">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Select your new device</h2>
                    <p className="opacity-60 text-sm">Your trade-in credit will be applied to the balance.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {targetPhones.map(p => {
                      const selected = formData.targetPhoneId === p.id;
                      const bal = Math.max(0, p.price - tradeInValue);
                      return (
                        <button key={p.id}
                          onClick={() => setFormData(f => ({ ...f, targetPhoneId: p.id }))}
                          className={`relative flex flex-col items-center gap-2 p-4 pt-5 rounded-2xl border transition-all duration-200 group text-center ${selected
                            ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_16px_rgba(205,160,50,0.2)] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          {selected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#CDA032] flex items-center justify-center">
                              <Check size={9} className="text-black" strokeWidth={4} />
                            </div>
                          )}
                          <div className="w-16 h-16 flex items-center justify-center">
                            <img src={p.image} alt={p.name} className="h-14 w-auto object-contain transition-all duration-200 group-hover:scale-105" />
                          </div>
                          <p className={`text-[11px] font-black leading-tight ${selected ? 'text-[#CDA032]' : ''}`}>{p.name}</p>
                          <p className="text-xs font-black text-white">{formatCurrency(p.price)}</p>
                          {tradeInValue > 0 && (
                            <p className="text-[10px] font-bold text-emerald-400">Pay: {formatCurrency(bal)}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {formData.targetPhoneId && targetPhone && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[#CDA032]/30 bg-[#CDA032]/5 animate-in fade-in">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Upgrading To</p>
                        <p className="text-sm font-bold">{targetPhone.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Balance Due</p>
                        <p className="text-xl font-black text-[#CDA032]">{formatCurrency(difference)}</p>
                        {savingsPct > 0 && (
                          <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-end">
                            <Sparkles size={10} /> Save {savingsPct}% with trade-in
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      if (!formData.targetPhoneId) { notify('Please select a device to upgrade to.', 'error'); return; }
                      go(3);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Continue to Booking <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Schedule & Contact */}
            {step > 3 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Booking Details</p>
                  <h3 className="text-xl font-black text-white">
                    {formData.date} at {timeSlots.find(t => t.id === formData.timeSlot)?.time}
                  </h3>
                </div>
                <button onClick={() => setStep(3)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 3 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Schedule your drop-off</h2>
                  <p className="opacity-60 text-sm">Choose a time to bring your device in for inspection.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Date</h3>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        onClick={e => (e.target as any).showPicker?.()}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-12 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 cursor-pointer h-[54px]"
                        style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                      />
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CDA032] pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Time Slot</h3>
                    <div className="relative">
                      <select
                        value={formData.timeSlot}
                        onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                        className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 appearance-none cursor-pointer h-[54px]"
                      >
                        <option value="">Select an available time...</option>
                        {timeSlots.map(t => (
                          <option key={t.id} value={t.id} disabled={!t.available}>
                            {t.time} - {t.available ? t.label : 'Fully Booked'}
                          </option>
                        ))}
                      </select>
                      <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-8 border-t border-[var(--bb-border)]">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Your Details</h2>
                    <p className="opacity-60 text-sm">We'll use this to keep you updated on your trade-in status.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { placeholder: 'Full Name', value: formData.name, key: 'name', icon: <User size={16} /> },
                      { placeholder: 'Phone Number', value: formData.phone, key: 'phone', icon: <Phone size={16} /> },
                    ].map(f => (
                      <div key={f.key} className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none">{f.icon}</span>
                        <input
                          placeholder={f.placeholder}
                          value={f.value}
                          onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                          className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50"
                        />
                      </div>
                    ))}
                    <div className="relative md:col-span-2">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50"
                      />
                    </div>
                    <div className="relative md:col-span-2">
                      <MapPin size={16} className="absolute left-4 top-3.5 opacity-40 pointer-events-none" />
                      <textarea
                        placeholder="Pickup Address (Optional — if you want us to collect the device)"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => {
                      if (!formData.date || !formData.timeSlot) { notify('Please select a date and time slot.', 'error'); return; }
                      if (!formData.name || !formData.phone || !formData.email) { notify('Please fill in all contact details.', 'error'); return; }
                      go(4);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Review Trade-In <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 — Review & Confirm */}
            {step === 4 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">Review your trade-in</h2>
                  <p className="opacity-60 text-sm">Please verify your details before submitting.</p>
                </div>

                <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] overflow-hidden shadow-2xl">
                  {/* Banner */}
                  <div className="p-8 border-b border-[var(--bb-border)] bg-black/5 dark:bg-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#CDA032]/10 blur-3xl rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-2">Trade-In Summary</p>
                    <h3 className="text-2xl font-black mb-1">{formData.brand} {formData.model}</h3>
                    <p className="text-lg opacity-80 capitalize">{conditionLabels[formData.condition].label} Condition → {targetPhone?.name}</p>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Cost breakdown */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="opacity-70">New Device Price</span>
                        <span className="font-bold">{targetPhone ? formatCurrency(targetPhone.price) : '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="opacity-70">Trade-In Credit ({conditionLabels[formData.condition].label})</span>
                        <span className="font-bold text-emerald-400">− {formatCurrency(tradeInValue)}</span>
                      </div>
                      <div className="pt-4 mt-4 border-t border-[var(--bb-border)] flex justify-between items-end">
                        <span className="text-base font-black">Balance Due</span>
                        <span className="text-3xl font-black text-[#CDA032]">{formatCurrency(difference)}</span>
                      </div>
                      <div className="flex gap-3 items-start p-4 bg-[#CDA032]/10 rounded-xl mt-4">
                        <Info size={16} className="text-[#CDA032] shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-[#CDA032] font-semibold">
                          Final trade-in value confirmed after physical inspection. You'll never be charged without your explicit approval.
                        </p>
                      </div>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[var(--bb-border)]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Appointment</p>
                        <p className="text-sm font-semibold">{formData.date}</p>
                        <p className="text-sm opacity-80">{timeSlots.find(t => t.id === formData.timeSlot)?.time}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Customer Info</p>
                        <p className="text-sm font-semibold">{formData.name}</p>
                        <p className="text-sm opacity-80">{formData.phone}</p>
                        <p className="text-sm opacity-80">{formData.email}</p>
                        {formData.address && (
                          <div className="mt-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Pickup Address</p>
                            <p className="text-sm border-l-2 border-[#CDA032] pl-2 opacity-80">{formData.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={submitTradeRequest}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest text-[#111] bg-gradient-to-r from-[#CDA032] to-[#FCE69B] hover:scale-[1.02] shadow-[0_0_30px_rgba(205,160,50,0.3)] transition-all active:scale-95"
                  >
                    Confirm Trade-In <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop only) ── */}
          {step > 1 && (
            <div className="hidden lg:block w-[350px] shrink-0 sticky top-32">
              <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-xl space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] border-b border-[var(--bb-border)] pb-4">Trade-In Summary</h3>

                {/* Device being traded */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                    {(() => {
                      const IconComp = deviceTypes.find(d => d.id === formData.deviceType)?.icon as any;
                      return IconComp ? <IconComp size={18} className="text-[#CDA032]" /> : null;
                    })()}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Trading In</p>
                    <p className="text-sm font-bold">{formData.brand} {formData.model}</p>
                    {formData.model && (
                      <p className="text-xs text-emerald-400 font-bold capitalize mt-0.5">
                        {conditionLabels[formData.condition].label} · {formatCurrency(tradeInValue)}
                      </p>
                    )}
                  </div>
                </div>

                {step > 2 && targetPhone && (
                  <div className="flex gap-4 animate-in fade-in">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={targetPhone.image} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Upgrading To</p>
                      <p className="text-sm font-bold leading-snug">{targetPhone.name}</p>
                      <p className="text-xs opacity-60">{formatCurrency(targetPhone.price)}</p>
                    </div>
                  </div>
                )}

                {step > 3 && formData.date && formData.timeSlot && (
                  <div className="flex gap-4 animate-in fade-in">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                      <Calendar size={18} className="text-[#CDA032]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Appointment</p>
                      <p className="text-sm font-bold">{formData.date}</p>
                      <p className="text-xs opacity-70 mt-0.5">{timeSlots.find(t => t.id === formData.timeSlot)?.time}</p>
                    </div>
                  </div>
                )}

                {step >= 2 && tradeInValue > 0 && (
                  <div className="pt-6 border-t border-[var(--bb-border)] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="opacity-50">Trade-in credit</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(tradeInValue)}</span>
                    </div>
                    {targetPhone && (
                      <div className="flex justify-between text-xs">
                        <span className="opacity-50">Device price</span>
                        <span className="font-bold">{formatCurrency(targetPhone.price)}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-[var(--bb-border)]">
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">Balance Due</p>
                      <p className="text-2xl font-black text-[#CDA032] tracking-tighter">
                        {targetPhone ? formatCurrency(difference) : '—'}
                      </p>
                      {savingsPct > 0 && (
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <Sparkles size={9} /> Save {savingsPct}% with trade-in
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Guarantee */}
                <div className="rounded-2xl p-4 space-y-1.5 bg-[#CDA032]/5 border border-[#CDA032]/20">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-[#CDA032]" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#CDA032]">Best Value Guarantee</h4>
                  </div>
                  <p className="text-[10px] opacity-50 leading-relaxed">
                    Find a better offer within 48 hrs and we'll match it plus 10%.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};