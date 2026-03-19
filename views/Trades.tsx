import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCcw, Smartphone, Laptop, Tablet, Gamepad2, Watch, MonitorSmartphone,
  ArrowRight, Check, Send, User, Phone, Mail, Calendar,
  Package, Info, CheckCircle2, XCircle, ChevronRight, MapPin
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { Product, TradeRequest } from '../types';
import { useAppContext } from '../App';
import { TRADE_DEVICES_KEY } from './admin/adminUtils';
import { createTradeRequest, getTradeRequests, updateTradeRequest } from '../lib/api';

interface TradesProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onQuickView?: (product: Product) => void;
}

// ── Brand catalogue ────────────────────────────────────────────────────────────
const BRANDS = [
  { id: 'apple', name: 'Apple', logo: '' },
  { id: 'samsung', name: 'Samsung', logo: '𖠌' },
  { id: 'google', name: 'Google', logo: 'G' },
  { id: 'sony', name: 'Sony', logo: 'SONY' },
  { id: 'microsoft', name: 'Microsoft', logo: '⊞' },
  { id: 'nintendo', name: 'Nintendo', logo: 'Game' },
  { id: 'dell', name: 'Dell', logo: 'Dell' },
  { id: 'hp', name: 'HP', logo: 'HP' },
  { id: 'lenovo', name: 'Lenovo', logo: 'Lenovo' },
  { id: 'other', name: 'Other', logo: '📱' },
];

// ── Device catalogue (each device tagged with a brand) ────────────────────────
const DEFAULT_TRADE_DEVICES = [
  { id: 'iphone', brand: 'apple', name: 'iPhone', icon: Smartphone, variants: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone X', 'iPhone SE', 'Other iPhone'] },
  { id: 'macbook', brand: 'apple', name: 'MacBook', icon: Laptop, variants: ['MacBook Pro M4', 'MacBook Pro M3', 'MacBook Air M3', 'MacBook Air M2', 'MacBook Air M1', 'MacBook Pro M1', 'Older MacBook'] },
  { id: 'ipad', brand: 'apple', name: 'iPad', icon: Tablet, variants: ['iPad Pro M4', 'iPad Pro M2', 'iPad Air M2', 'iPad Air M1', 'iPad (10th gen)', 'iPad mini', 'Older iPad'] },
  { id: 'watch_apple', brand: 'apple', name: 'Apple Watch', icon: Watch, variants: ['Apple Watch Series 10', 'Apple Watch Ultra 2', 'Apple Watch Series 9', 'Apple Watch SE', 'Older Apple Watch'] },
  { id: 'samsung', brand: 'samsung', name: 'Galaxy Phone', icon: Smartphone, variants: ['Galaxy S25 Ultra', 'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy Z Fold 6', 'Galaxy Z Flip 6', 'Galaxy A55', 'Galaxy A35', 'Other Samsung'] },
  { id: 'galaxy_tab', brand: 'samsung', name: 'Galaxy Tab', icon: Tablet, variants: ['Galaxy Tab S10 Ultra', 'Galaxy Tab S9', 'Galaxy Tab S8', 'Galaxy Tab A9', 'Other Galaxy Tab'] },
  { id: 'watch_sam', brand: 'samsung', name: 'Galaxy Watch', icon: Watch, variants: ['Galaxy Watch 7', 'Galaxy Watch Ultra', 'Galaxy Watch 6', 'Galaxy Watch 5', 'Other Galaxy Watch'] },
  { id: 'pixel', brand: 'google', name: 'Google Pixel', icon: Smartphone, variants: ['Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 6', 'Other Pixel'] },
  { id: 'ps', brand: 'sony', name: 'PlayStation', icon: Gamepad2, variants: ['PS5 Disc Edition', 'PS5 Digital Edition', 'PS4 Pro', 'PS4 Slim', 'PS4', 'PS VR2', 'Other PlayStation'] },
  { id: 'xbox', brand: 'microsoft', name: 'Xbox', icon: Gamepad2, variants: ['Xbox Series X', 'Xbox Series S', 'Xbox One X', 'Xbox One S', 'Xbox One', 'Other Xbox'] },
  { id: 'surface', brand: 'microsoft', name: 'Surface', icon: Laptop, variants: ['Surface Pro 11', 'Surface Pro 10', 'Surface Laptop 6', 'Surface Laptop 5', 'Surface Book', 'Other Surface'] },
  { id: 'switch', brand: 'nintendo', name: 'Nintendo Switch', icon: Gamepad2, variants: ['Switch OLED', 'Switch V2', 'Switch Lite', 'Original Switch'] },
  { id: 'dell', brand: 'dell', name: 'Dell Laptop', icon: Laptop, variants: ['XPS 15', 'XPS 13', 'Inspiron 15', 'Inspiron 13', 'Latitude', 'Other Dell'] },
  { id: 'hp', brand: 'hp', name: 'HP Laptop', icon: Laptop, variants: ['Spectre x360', 'Envy', 'Pavilion', 'EliteBook', 'ProBook', 'Other HP'] },
  { id: 'lenovo', brand: 'lenovo', name: 'Lenovo Laptop', icon: Laptop, variants: ['ThinkPad X1', 'ThinkPad E Series', 'IdeaPad', 'Legion', 'Yoga', 'Other Lenovo'] },
  { id: 'other', brand: 'other', name: 'Other Device', icon: MonitorSmartphone, variants: ['Headphones/Earbuds', 'Smart Speaker', 'Camera', 'Drone', 'Other'] },
];

const generateId = () => `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ── Status badge helper ────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TradeRequest['status'] }) => {
  const map: Record<string, string> = {
    'Pending': 'bg-yellow-500/10 text-yellow-400',
    'Inspecting': 'bg-blue-500/10 text-blue-400',
    'Offer Made': 'bg-purple-500/10 text-purple-400',
    'Awaiting User': 'bg-purple-500/10 text-purple-400',
    'Accepted': 'bg-green-500/10 text-green-400',
    'Completed': 'bg-emerald-500/10 text-emerald-400',
    'Rejected': 'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${map[status] || 'bg-white/5 text-white/30'}`}>
      {status}
    </span>
  );
};

// ── Component ──────────────────────────────────────────────────────────────────
export const Trades: React.FC<TradesProps> = ({ products, notify }) => {
  const { user, theme } = useAppContext();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Device list (can be overridden by admin)
  const [tradeDevices, setTradeDevices] = useState(DEFAULT_TRADE_DEVICES);
  const [myTrades, setMyTrades] = useState<TradeRequest[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form steps: 1=brand, 2=category, 3=model, 4=upgrade+notes, 5=contact+schedule, 6=review, 7=success
  const [step, setStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<typeof tradeDevices[0] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [targetProductId, setTargetProductId] = useState('');
  const [notes, setNotes] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    date: '',
    timeSlot: '',
    fulfillmentMethod: 'Headquarters' as 'Headquarters' | 'Pickup'
  });

  const [deviceDetails, setDeviceDetails] = useState({
    serialNumber: '',
    physicalDesc: '',
    issueDesc: '',
    whenStarted: '',
    previousRepairs: ''
  });

  const [accessories, setAccessories] = useState({
    chargers: false,
    caseCover: false,
    cables: false,
    memory: false,
    other: false
  });

  // Admin-managed device list
  useEffect(() => {
    try {
      const d = localStorage.getItem(TRADE_DEVICES_KEY);
      if (d) {
        const parsed = JSON.parse(d);
        const withIcons = parsed.map((dev: any) => {
          const def = DEFAULT_TRADE_DEVICES.find(x => x.id === dev.id);
          return { ...dev, icon: def?.icon || MonitorSmartphone, brand: dev.brand || def?.brand || 'other' };
        });
        setTradeDevices(withIcons);
      }
    } catch { }
  }, []);

  // Load user's past trades from Supabase
  useEffect(() => {
    if (!user) return;
    setLoadingTrades(true);
    getTradeRequests(user.id)
      .then(d => setMyTrades(d as TradeRequest[]))
      .catch(() => { })
      .finally(() => setLoadingTrades(false));
  }, [user]);

  // Filtered devices based on brand
  const devicesByBrand = useMemo(() => {
    return tradeDevices.filter(d => d.brand === selectedBrand);
  }, [tradeDevices, selectedBrand]);

  // Derived: Brands that actually have devices
  const activeBrands = useMemo(() => {
    const brandsInUse = new Set(tradeDevices.map(d => d.brand));
    return BRANDS.filter(b => brandsInUse.has(b.id) || b.id === 'other');
  }, [tradeDevices]);

  const upgradeProducts = useMemo(() =>
    products.filter(p => ['iPhone', 'Laptop', 'Tablet', 'Gaming'].includes(p.category)),
    [products]);

  const targetProduct = useMemo(() =>
    products.find(p => p.id === targetProductId),
    [products, targetProductId]);

  // Pending offer
  const pendingOffer = myTrades.find(t => t.status === 'Awaiting User' || t.status === 'Offer Made');

  const timeSlots = [
    { id: 'morning-1', time: '9:00 AM', label: 'Early Morning' },
    { id: 'morning-2', time: '10:30 AM', label: 'Mid Morning' },
    { id: 'afternoon-2', time: '2:00 PM', label: 'Early Afternoon' },
    { id: 'afternoon-3', time: '3:30 PM', label: 'Mid Afternoon' },
    { id: 'evening-1', time: '5:00 PM', label: 'Evening' },
  ];

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submitRequest = async () => {
    if (!user) { navigate({ to: '/auth' }); return; }
    if (!selectedDevice || !selectedVariant) { notify('Please select your device', 'error'); return; }
    if (!formData.name || !formData.email || !formData.phone || !formData.address) { notify('Please fill in all contact details', 'error'); return; }

    setSubmitting(true);
    try {
      const accessoriesList = Object.entries(accessories)
        .filter(([_, v]) => v)
        .map(([k, _]) => k)
        .join(', ');

      const detailsText = `${notes ? notes + '\n\n' : ''}Serial Number: ${deviceDetails.serialNumber || 'N/A'}\nPhysical Description: ${deviceDetails.physicalDesc || 'N/A'}\nIssues: ${deviceDetails.issueDesc || 'N/A'}\nWhen Started: ${deviceDetails.whenStarted || 'N/A'}\nPrevious Repairs: ${deviceDetails.previousRepairs || 'N/A'}\nAccessories: ${accessoriesList || 'None'}`;

      const data = await createTradeRequest({
        user_id: user.id,
        user_name: formData.name,
        user_email: formData.email,
        device: `${selectedDevice.name} — ${selectedVariant}`,
        target_device: targetProduct?.name || '',
        user_description: detailsText,
        preferred_date: formData.date,
        preferred_time: timeSlots.find(t => t.id === formData.timeSlot)?.time || '',
        contact_name: formData.name,
        contact_email: formData.email,
        contact_phone: formData.phone,
        fulfillment_method: formData.fulfillmentMethod,
      });
      // Optimistically add to local list
      setMyTrades(prev => [{
        id: data.id,
        userId: user.id,
        userName: formData.name,
        userEmail: formData.email,
        device: `${selectedDevice.name} — ${selectedVariant}`,
        status: 'Pending',
        date: new Date().toISOString(),
        estimatedValue: 0,
        condition: undefined,
      } as TradeRequest, ...prev]);
      notify("Trade-in request submitted! We'll review and send you an offer within 24 hours.", 'success');
      go(6);
    } catch (err: any) {
      notify('Submission failed: ' + (err.message || 'Please try again'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferResponse = async (tradeId: string, accept: boolean) => {
    try {
      await updateTradeRequest(tradeId, { status: accept ? 'Accepted' : 'Rejected' });
      setMyTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: accept ? 'Accepted' : 'Rejected' } : t));
      notify(accept ? "Offer accepted! We'll contact you to arrange the trade-in." : 'Offer declined.', accept ? 'success' : 'info');
    } catch { notify('Failed to update. Please try again.', 'error'); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32 relative" style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-text)' }}>
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 60%)', filter: 'blur(100px)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translate(-30%, 30%)' }} />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-14 z-10 relative">

        {/* Header */}
        <header className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#CDA032]/10 border border-[#CDA032]/30">
              <RefreshCcw size={20} className="text-[#CDA032]" />
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#CDA032]">
              BlackBox Trade-In Center
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[1.1]">
            Trade in. Upgrade<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CDA032] to-[#FCE69B]">without the hassle.</span>
          </h1>
          <p className="text-sm text-white/40 mt-4 max-w-xl">
            Submit your device details and our team will inspect and send you a personalised offer within 24 hours.
          </p>
        </header>

        {/* Pending offer banner */}
        {pendingOffer && (
          <div className="mb-8 bg-gradient-to-r from-purple-500/10 to-[#B38B21]/10 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">🎉 You Have a Trade-In Offer!</p>
                <p className="text-white font-black text-lg">{pendingOffer.device}</p>
                {pendingOffer.condition && <p className="text-xs text-white/50 mt-0.5">Condition assessed: <span className="text-white font-bold">{pendingOffer.condition}</span></p>}
                {pendingOffer.finalValue && <p className="text-2xl font-black text-[#B38B21] mt-2">${pendingOffer.finalValue} <span className="text-xs text-white/40 font-normal">trade-in value</span></p>}
                {pendingOffer.adminNote && <p className="text-xs text-white/50 mt-1 bg-white/5 rounded-xl p-2">{pendingOffer.adminNote}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOfferResponse(pendingOffer.id, true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-black text-xs uppercase rounded-xl hover:bg-green-400 transition-all">
                  <CheckCircle2 size={14} /> Accept
                </button>
                <button onClick={() => handleOfferResponse(pendingOffer.id, false)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white/70 font-black text-xs uppercase rounded-xl hover:bg-white/20 transition-all">
                  <XCircle size={14} /> Decline
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

          {/* ── Form ── */}
          <div className="flex-1 w-full min-w-0 space-y-6">

            {/* Step indicator */}
            {step < 6 && (
              <div className="flex items-center gap-1 sm:gap-2 mb-2 overflow-x-auto pb-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <React.Fragment key={s}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 transition-all ${step >= s ? 'bg-[#CDA032] text-black' : 'bg-white/5 text-white/20'}`}>
                      {step > s ? <Check size={12} /> : s}
                    </div>
                    {s < 5 && <div className={`flex-1 h-0.5 min-w-[12px] rounded-full transition-all ${step > s ? 'bg-[#CDA032]' : 'bg-white/10'}`} />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* ── STEP 1: Brand ── */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Select the brand</h2>
                  <p className="text-sm text-white/40">We'll show only devices from that manufacturer.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {BRANDS.map(b => (
                    <button key={b.id} onClick={() => setSelectedBrand(b.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${selectedBrand === b.id
                        ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_20px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}>
                      <span className="text-2xl mb-1.5">{b.logo}</span>
                      <span className={`text-xs font-bold ${selectedBrand === b.id ? 'text-[#CDA032]' : 'text-white/70'}`}>{b.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { if (!selectedBrand) { notify('Please select a brand', 'error'); return; } go(2); }}
                  disabled={!selectedBrand}
                  className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── STEP 2: Category ── */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="flex items-center justify-between py-4 border-b border-[var(--bb-border)]">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Brand</p>
                    <h3 className="text-lg font-black capitalize">{BRANDS.find(b => b.id === selectedBrand)?.name}</h3>
                  </div>
                  <button onClick={() => go(1)} className="text-sm font-bold text-blue-500">Change</button>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">What type of device?</h2>
                  <p className="text-sm text-white/40">Select the category that matches your device.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {devicesByBrand.map(dev => {
                    const Icon = dev.icon || MonitorSmartphone;
                    const isSelected = selectedDevice?.id === dev.id;
                    return (
                      <button key={dev.id} onClick={() => { setSelectedDevice(dev); go(3); }}
                        className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${isSelected
                          ? 'bg-[#CDA032]/10 border-[#CDA032] ring-1 ring-[#CDA032]'
                          : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40'}`}>
                        <Icon size={26} strokeWidth={1.5} className={`mb-2 transition-colors ${isSelected ? 'text-[#CDA032]' : 'opacity-50'}`} />
                        <span className={`text-xs font-bold text-center leading-tight ${isSelected ? 'text-[#CDA032]' : 'opacity-80'}`}>{dev.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => go(1)} className="px-5 py-3 rounded-xl border border-[var(--bb-border)] text-sm font-bold opacity-60 hover:opacity-100 transition-all">Back</button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Model ── */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="flex flex-col gap-3 py-4 border-b border-[var(--bb-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Selection</p>
                      <h3 className="text-base font-black capitalize">{BRANDS.find(b => b.id === selectedBrand)?.name} · {selectedDevice?.name}</h3>
                    </div>
                    <button onClick={() => go(2)} className="text-sm font-bold text-blue-500">Change</button>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Select your specific model</h2>
                  <p className="text-sm text-white/40">Choose the exact model from the list below.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedDevice?.variants.map(v => (
                    <button key={v} onClick={() => setSelectedVariant(v)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition-all ${selectedVariant === v
                        ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40 opacity-70 hover:opacity-100'}`}>
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => go(2)} className="px-5 py-3 rounded-xl border border-[var(--bb-border)] text-sm font-bold opacity-60 hover:opacity-100 transition-all">Back</button>
                  <button onClick={() => { if (!selectedVariant) { notify('Please select your model', 'error'); return; } go(4); }}
                    disabled={!selectedVariant}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all disabled:opacity-40">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Upgrade + Notes ── */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                {[
                  { label: 'Brand', val: BRANDS.find(b => b.id === selectedBrand)?.name, onEdit: () => go(1) },
                  { label: 'Trading In', val: `${selectedDevice?.name} — ${selectedVariant}`, onEdit: () => go(3) },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-3 border-b border-[var(--bb-border)]">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">{s.label}</p>
                      <h3 className="text-base font-black">{s.val}</h3>
                    </div>
                    <button onClick={s.onEdit} className="text-sm font-bold text-blue-500">Change</button>
                  </div>
                ))}

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">What would you like to upgrade to?</h2>
                  <p className="text-xs text-white/40 mb-4">Optional — helps us tailor the offer to your upgrade goal.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <button onClick={() => setTargetProductId('')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${!targetProductId ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]' : 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-60 hover:opacity-100'}`}>
                      Not sure yet
                    </button>
                    {upgradeProducts.slice(0, 8).map(p => (
                      <button key={p.id} onClick={() => setTargetProductId(p.id)}
                        className={`flex flex-col items-center py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${targetProductId === p.id ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]' : 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-60 hover:opacity-100'}`}>
                        {p.image && <img src={p.image} alt={p.name} className="h-8 w-auto object-contain mb-1.5" />}
                        <span className="text-[10px] leading-tight">{p.name}</span>
                        <span className="text-[#CDA032] font-black mt-0.5">${p.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold mb-2">Device Details</h3>
                  <div className="space-y-3">
                    <input type="text" placeholder="Serial Number (Optional)" value={deviceDetails.serialNumber} onChange={e => setDeviceDetails({...deviceDetails, serialNumber: e.target.value})} className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                    <textarea rows={2} placeholder="Physical description (e.g. Scratches, dents?)" value={deviceDetails.physicalDesc} onChange={e => setDeviceDetails({...deviceDetails, physicalDesc: e.target.value})} className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none" />
                    <textarea rows={2} placeholder="Issues description (Describe the problem)" value={deviceDetails.issueDesc} onChange={e => setDeviceDetails({...deviceDetails, issueDesc: e.target.value})} className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none" />
                    <input type="text" placeholder="When did the issue start?" value={deviceDetails.whenStarted} onChange={e => setDeviceDetails({...deviceDetails, whenStarted: e.target.value})} className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                    <input type="text" placeholder="Any previous repairs made?" value={deviceDetails.previousRepairs} onChange={e => setDeviceDetails({...deviceDetails, previousRepairs: e.target.value})} className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold mb-2">Accessories Included</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-[var(--bb-text)] opacity-80">
                    {Object.entries({chargers: 'Chargers', caseCover: 'Case / Cover', cables: 'Cables', memory: 'Memory', other: 'Other'}).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={(accessories as any)[k]} onChange={e => setAccessories({...accessories, [k]: e.target.checked})} className="accent-[#CDA032]" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold mb-2">Additional Notes (Optional)</h3>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any other details..."
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none" />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => go(3)} className="px-5 py-3 rounded-xl border border-[var(--bb-border)] text-sm font-bold opacity-60 hover:opacity-100 transition-all">Back</button>
                  <button onClick={() => go(5)} className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 5: Contact + Schedule ── */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Book a drop-off or pickup</h2>
                  <p className="text-xs text-white/40 mb-5">Choose how you'd like to get your device to our service center.</p>
                </div>

                <div className="space-y-4 mb-6">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] block mb-2">How will we receive your device?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'Headquarters', label: 'Bring to Headquarters', desc: 'Fastest assessment', icon: MapPin },
                      { id: 'Pickup', label: 'Request Pickup', desc: 'Convenient service', icon: Package },
                    ].map(method => (
                      <button key={method.id}
                        onClick={() => setFormData({ ...formData, fulfillmentMethod: method.id as any })}
                        className={`flex flex-col p-4 rounded-xl border transition-all ${formData.fulfillmentMethod === method.id
                          ? 'border-[#CDA032] bg-[#CDA032]/10 ring-1 ring-[#CDA032]'
                          : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)]'}`}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <method.icon size={16} className={formData.fulfillmentMethod === method.id ? 'text-[#CDA032]' : 'opacity-50'} />
                        </div>
                        <span className={`text-xs font-bold text-left ${formData.fulfillmentMethod === method.id ? 'text-[#CDA032]' : ''}`}>{method.label}</span>
                        <span className="text-[9px] opacity-40 mt-0.5 text-left uppercase tracking-widest">{method.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1.5">Preferred Date</label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDA032] pointer-events-none" />
                      <input type="date" value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-3 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 h-[50px]"
                        style={{ colorScheme: isDark ? 'dark' : 'light' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1.5">Time Slot</label>
                    <select value={formData.timeSlot} onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                      className="w-full border border-[var(--bb-border)] rounded-xl px-3 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 h-[50px] appearance-none">
                      <option value="">Pick a time...</option>
                      {timeSlots.map(t => <option key={t.id} value={t.id}>{t.time} — {t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { placeholder: 'Full Name', key: 'name', icon: User, type: 'text' },
                    { placeholder: 'Phone Number', key: 'phone', icon: Phone, type: 'tel' },
                  ].map(f => (
                    <div key={f.key} className="relative">
                      <f.icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      <input type={f.type} placeholder={f.placeholder} value={(formData as any)[f.key]}
                        onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-3 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                    </div>
                  ))}
                  <div className="relative sm:col-span-2">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    <input type="email" placeholder="Email Address" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-3 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                  </div>
                  <div className="relative sm:col-span-2">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    <input type="text" placeholder="Physical Address" value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-3 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => go(4)} className="px-5 py-3 rounded-xl border border-[var(--bb-border)] text-sm font-bold opacity-60 hover:opacity-100 transition-all">Back</button>
                  <button onClick={() => {
                    if (!formData.name || !formData.email || !formData.phone) { notify('Please fill in all contact details', 'error'); return; }
                    go(6);
                  }} className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all">
                    Review Request <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 6: Review ── */}
            {step === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1">Review your request</h2>
                  <p className="text-xs text-white/40">Our team will assess the device and send you an offer within 24 hours.</p>
                </div>
                <div className="border border-[var(--bb-border)] rounded-2xl overflow-hidden bg-[var(--bb-surface)]">
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-[#CDA032]/10 to-transparent border-b border-[var(--bb-border)]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032] mb-1">Trade-In Request Summary</p>
                    <h3 className="text-lg sm:text-xl font-black">{selectedDevice?.name} — {selectedVariant}</h3>
                    <p className="text-xs text-white/50 mt-0.5">Brand: {BRANDS.find(b => b.id === selectedBrand)?.name}</p>
                    {targetProduct && <p className="text-sm text-white/50 mt-0.5">Target upgrade: {targetProduct.name} (${targetProduct.price})</p>}
                  </div>
                  <div className="p-4 sm:p-5 space-y-3 text-xs">
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#CDA032]/5 border border-[#CDA032]/10">
                      <Info size={13} className="text-[#CDA032] shrink-0 mt-0.5" />
                      <p className="text-white/50">The condition and trade-in value will be assessed by our team. You'll receive a formal offer before any commitment is made.</p>
                    </div>
                    {[
                      ['Contact Name', formData.name],
                      ['Email', formData.email],
                      ['Phone', formData.phone],
                      ['Preferred Date', formData.date || '—'],
                      ['Time Slot', timeSlots.find(t => t.id === formData.timeSlot)?.time || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                        <span className="text-white/40">{k}</span>
                        <span className="text-white font-bold">{v}</span>
                      </div>
                    ))}
                    {notes && <div className="pt-2"><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Notes</p><p className="text-white/60">{notes}</p></div>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => go(5)} className="px-5 py-3 rounded-xl border border-[var(--bb-border)] text-sm font-bold opacity-60 hover:opacity-100 transition-all">Back</button>
                  <button onClick={submitRequest} disabled={submitting}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all disabled:opacity-50">
                    <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 7: Success ── */}
            {step === 7 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center py-10 sm:py-12">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-2">Request Submitted!</h2>
                  <p className="text-sm text-white/50 max-w-sm mx-auto">
                    Our team will review your {selectedDevice?.name} — {selectedVariant} and send a personalised offer to <span className="text-white font-bold">{formData.email}</span>.
                  </p>
                </div>
                <div className="bg-[var(--bb-surface)] border border-[var(--bb-border)] rounded-2xl p-4 text-left max-w-xs mx-auto space-y-2 text-xs text-white/50">
                  <p className="font-black text-white text-sm mb-2">What happens next?</p>
                  {['Our team reviews your request', 'We inspect & assess the condition', 'You receive an offer within 24h', 'Accept or decline — no pressure'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#CDA032] rounded-full flex items-center justify-center text-[8px] text-black font-black shrink-0">{i + 1}</div>
                      {s}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button onClick={() => { setStep(1); setSelectedBrand(''); setSelectedDevice(null); setSelectedVariant(''); setTargetProductId(''); setNotes(''); }}
                    className="px-6 py-3 border border-[var(--bb-border)] rounded-xl text-sm font-bold hover:border-[#CDA032]/40 transition-all">
                    New Request
                  </button>
                  <button onClick={() => navigate({ to: '/profile' })}
                    className="px-6 py-3 bg-[#CDA032] text-black rounded-xl text-sm font-black hover:bg-[#B38B21] transition-all">
                    View My Trades
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">
            {/* How it works */}
            <div className="border border-[var(--bb-border)] bg-[var(--bb-surface)] rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4">How It Works</h3>
              <div className="space-y-4">
                {[
                  { icon: Send, label: 'Submit', desc: 'Select brand, device model & contact info' },
                  { icon: Check, label: 'We Assess', desc: 'Our team inspects and grades your device' },
                  { icon: RefreshCcw, label: 'Get Offer', desc: 'Receive a personalised offer within 24h' },
                  { icon: Package, label: 'Trade In', desc: 'Accept and upgrade your tech' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#CDA032]/10 border border-[#CDA032]/20 flex items-center justify-center shrink-0">
                      <item.icon size={13} className="text-[#CDA032]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{item.label}</p>
                      <p className="text-[10px] text-white/40">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past trade requests */}
            {user && (
              <div className="border border-[var(--bb-border)] bg-[var(--bb-surface)] rounded-2xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest mb-4">My Requests</h3>
                {loadingTrades ? (
                  <p className="text-xs text-white/30">Loading...</p>
                ) : myTrades.length === 0 ? (
                  <p className="text-xs text-white/30">No trade-in requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {myTrades.slice(0, 5).map(t => (
                      <div key={t.id} className="border border-[var(--bb-border)] rounded-xl p-3">
                        <p className="text-xs font-black text-white truncate">{t.device}</p>
                        <div className="flex items-center justify-between mt-1">
                          <StatusBadge status={t.status} />
                          {t.finalValue && <span className="text-[10px] font-black text-[#CDA032]">${t.finalValue}</span>}
                        </div>
                        {(t.status === 'Awaiting User' || t.status === 'Offer Made') && (
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={() => handleOfferResponse(t.id, true)}
                              className="flex-1 py-1.5 bg-green-500/20 text-green-400 text-[9px] font-black uppercase rounded-lg hover:bg-green-500/30 transition-all">Accept</button>
                            <button onClick={() => handleOfferResponse(t.id, false)}
                              className="flex-1 py-1.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase rounded-lg hover:bg-red-500/20 transition-all">Decline</button>
                          </div>
                        )}
                        {t.adminNote && (
                          <p className="text-[10px] text-white/40 mt-1.5 bg-white/[0.03] rounded-lg p-2">{t.adminNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};