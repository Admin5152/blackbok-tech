import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  RefreshCcw, Smartphone, Laptop, Tablet, Gamepad2, Watch, MonitorSmartphone,
  ArrowLeft, ArrowRight, Check, Send, User, Phone, Mail, Calendar,
  Package, Info, CheckCircle2, XCircle, MapPin, Clock
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { Product, TradeRequest } from '../types';
import { useAppContext } from '../App';
import { TRADE_DEVICES_KEY } from './admin/adminUtils';
import {
  resolveUpgradeTargetProducts,
  TRADE_UPGRADE_PICKS_UPDATED_EVENT,
  TRADE_UPGRADE_PRODUCT_IDS_KEY,
} from '../lib/tradeUpgradePicks';
import { DEFAULT_TRADE_DEVICES, mergeTradeDevicesFromStorageArray } from '../data/tradeInDevices';
import { createTradeRequest, getTradeRequests, updateTradeRequest } from '../lib/api';
import { saveResumeAfterAuth, peekRestorePayload, clearRestorePayload } from '../lib/resumeAfterAuth';

interface TradesProps {
  products: Product[];
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onQuickView?: (product: Product) => void;
}

// ── Device types (Step 1 — mirrors Repair's "What can we help you with?") ──────
const DEVICE_TYPES = [
  { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
  { id: 'laptop',     label: 'Laptop',     icon: Laptop     },
  { id: 'tablet',     label: 'Tablet',     icon: Tablet     },
  { id: 'gaming',     label: 'Console',    icon: Gamepad2   },
  { id: 'watch',      label: 'Watch',      icon: Watch      },
  { id: 'other',      label: 'Other',      icon: MonitorSmartphone },
];

// ── Brands with images (Step 2 — mirrors Repair's brand image cards) ───────────
const BRANDS_WITH_IMGS = [
  { id: 'Apple',     label: 'Apple',     img: '/iphone_modern.png'   },
  { id: 'Samsung',   label: 'Samsung',   img: '/galaxy_s24.png'      },
  { id: 'Google',    label: 'Google',    img: '/pixel_phone.png'     },
  { id: 'Sony',      label: 'Sony',      img: '/sony_phone.png'      },
  { id: 'Microsoft', label: 'Microsoft', img: '/surface.png'         },
  { id: 'Nintendo',  label: 'Nintendo',  img: '/nintendo_switch.png' },
  { id: 'Dell',      label: 'Dell',      img: '/dell_laptop.png'     },
  { id: 'HP',        label: 'HP',        img: '/hp_laptop.png'       },
  { id: 'Lenovo',    label: 'Lenovo',    img: '/lenovo_laptop.png'   },
  { id: 'Other',     label: 'Other',     img: '/other_device.png'    },
];

// ── Status badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TradeRequest['status'] }) => {
  const map: Record<string, string> = {
    'Pending':       'bg-yellow-500/10 text-yellow-400',
    'Inspecting':    'bg-blue-500/10 text-blue-400',
    'Offer sent':    'bg-purple-500/10 text-purple-400',
    'Offer Made':    'bg-purple-500/10 text-purple-400',
    'Awaiting User': 'bg-purple-500/10 text-purple-400',
    'Accepted':      'bg-green-500/10 text-green-400',
    'Completed':     'bg-emerald-500/10 text-emerald-400',
    'Rejected':      'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${map[status] || 'bg-[var(--bb-surface-2)] text-[color:var(--bb-muted)] border border-[var(--bb-border)]'}`}>
      {status}
    </span>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
export const Trades: React.FC<TradesProps> = ({ products, notify }) => {
  const { user, theme } = useAppContext();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [tradeDevices, setTradeDevices] = useState(DEFAULT_TRADE_DEVICES);
  const [myTrades, setMyTrades]         = useState<TradeRequest[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // The freshly-submitted trade — kept around so the success step
  // can display the human-friendly TRD00001-style display_id that
  // the DB trigger generated.
  const [lastSubmittedTrade, setLastSubmittedTrade] = useState<TradeRequest | null>(null);

  // ── Mirror Repair's step/subStep structure exactly ─────────────────────────
  // step 1 = device selection (sub-stepped like Repair)
  // step 2 = trade-in details + upgrade target
  // step 3 = contact + schedule
  // step 4 = review & submit
  const [step, setStep]         = useState(1);
  const [subStep, setSubStep]   = useState(1); // 1=deviceType, 2=brand, 3=model
  const [transitionKey, setTransitionKey] = useState(0);

  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [selectedBrand, setSelectedBrand]           = useState('');
  const [selectedDevice, setSelectedDevice]         = useState<typeof tradeDevices[0] | null>(null);
  const [selectedVariant, setSelectedVariant]       = useState('');
  const [targetProductId, setTargetProductId]       = useState('');
  const [notes, setNotes]                           = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '', email: user?.email || '',
    phone: '', address: '', date: '', timeSlot: '',
    fulfillmentMethod: 'Headquarters' as 'Headquarters' | 'Pickup',
  });

  const [deviceDetails, setDeviceDetails] = useState({
    serialNumber: '', physicalDesc: '', issueDesc: '',
    whenStarted: '', previousRepairs: '',
  });

  const [accessories, setAccessories] = useState({
    chargers: false, caseCover: false, cables: false, memory: false, other: false,
  });

  const formRef = useRef<HTMLDivElement>(null);
  const tradesRestoreDone = useRef(false);
  const [upgradePicksRev, setUpgradePicksRev] = useState(0);

  // Scroll to active section on step/subStep change — mirrors Repair
  useEffect(() => {
    if (formRef.current) {
      const active = formRef.current.querySelector('.active-form-section');
      if (active) {
        setTimeout(() => {
          const offset = 140;
          const top = active.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }, 80);
      }
    }
  }, [step, subStep]);

  // Admin device list override (merged onto catalog so deviceType/brand/img stay valid)
  useEffect(() => {
    try {
      const d = localStorage.getItem(TRADE_DEVICES_KEY);
      if (d) {
        const parsed = JSON.parse(d);
        setTradeDevices(mergeTradeDevicesFromStorageArray(parsed));
      }
    } catch { /* keep DEFAULT_TRADE_DEVICES */ }
  }, []);

  // Load past trades
  useEffect(() => {
    if (!user) return;
    setLoadingTrades(true);
    getTradeRequests(user.id)
      .then(d => setMyTrades(d as TradeRequest[]))
      .catch(() => {})
      .finally(() => setLoadingTrades(false));
  }, [user]);

  // After login: restore trade-in wizard from session (see submitRequest when !user).
  useEffect(() => {
    if (!user) {
      tradesRestoreDone.current = false;
      return;
    }
    if (tradesRestoreDone.current) return;

    const payload = peekRestorePayload('trades') as Record<string, unknown> | null;
    if (!payload || typeof payload !== 'object') {
      tradesRestoreDone.current = true;
      return;
    }

    const needId = payload.selectedDeviceId as string | null | undefined;
    if (needId) {
      const dev = tradeDevices.find((d) => d.id === needId);
      if (!dev && typeof payload.step === 'number' && payload.step > 1) {
        clearRestorePayload('trades');
        notify('Please pick your device again — the saved model is no longer available.', 'info');
        tradesRestoreDone.current = true;
        return;
      }
    }

    clearRestorePayload('trades');
    tradesRestoreDone.current = true;

    if (typeof payload.step === 'number' && payload.step >= 1 && payload.step <= 5) setStep(payload.step);
    if (typeof payload.subStep === 'number' && payload.subStep >= 1 && payload.subStep <= 3) setSubStep(payload.subStep);
    if (typeof payload.transitionKey === 'number') setTransitionKey(payload.transitionKey);
    if (typeof payload.selectedDeviceType === 'string') setSelectedDeviceType(payload.selectedDeviceType);
    if (typeof payload.selectedBrand === 'string') setSelectedBrand(payload.selectedBrand);
    if (needId) {
      const dev = tradeDevices.find((d) => d.id === needId);
      if (dev) setSelectedDevice(dev);
    }
    if (typeof payload.selectedVariant === 'string') setSelectedVariant(payload.selectedVariant);
    if (typeof payload.targetProductId === 'string') setTargetProductId(payload.targetProductId);
    if (typeof payload.notes === 'string') setNotes(payload.notes);
    if (payload.formData && typeof payload.formData === 'object') {
      setFormData((prev) => ({ ...prev, ...(payload.formData as typeof prev) }));
    }
    if (payload.deviceDetails && typeof payload.deviceDetails === 'object') {
      setDeviceDetails((prev) => ({ ...prev, ...(payload.deviceDetails as typeof prev) }));
    }
    if (payload.accessories && typeof payload.accessories === 'object') {
      setAccessories((prev) => ({ ...prev, ...(payload.accessories as typeof prev) }));
    }
    notify('Your trade-in progress was restored.', 'success');
  }, [user, tradeDevices, notify]);

  // Brands that have devices of the selected type
  const brandsForType = useMemo(() => {
    const brandsInUse = new Set(
      tradeDevices.filter((d) => d.deviceType === selectedDeviceType).map((d) => d.brand),
    );
    const rows: { id: string; label: string; img: string }[] = [];
    brandsInUse.forEach((bid) => {
      const preset = BRANDS_WITH_IMGS.find((b) => b.id === bid);
      if (preset) rows.push(preset);
      else rows.push({ id: bid, label: bid, img: '/other_device.png' });
    });
    return rows.sort((a, b) => a.label.localeCompare(b.label));
  }, [tradeDevices, selectedDeviceType]);

  // Devices filtered by type + brand
  const devicesForBrand = useMemo(() =>
    tradeDevices.filter(d => d.deviceType === selectedDeviceType && d.brand === selectedBrand),
    [tradeDevices, selectedDeviceType, selectedBrand],
  );

  useEffect(() => {
    const bump = () => setUpgradePicksRev((v) => v + 1);
    window.addEventListener(TRADE_UPGRADE_PICKS_UPDATED_EVENT, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TRADE_UPGRADE_PRODUCT_IDS_KEY) bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(TRADE_UPGRADE_PICKS_UPDATED_EVENT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const upgradeProducts = useMemo(
    () => resolveUpgradeTargetProducts(products),
    [products, upgradePicksRev],
  );

  const targetProduct = useMemo(() =>
    products.find(p => p.id === targetProductId),
    [products, targetProductId],
  );

  const pendingOffer = myTrades.find(
    t => t.status === 'Awaiting User' || t.status === 'Offer sent' || t.status === 'Offer Made',
  );

  const timeSlots = [
    { id: 'morning-1',   time: '9:00 AM',  label: 'Early Morning',   available: true  },
    { id: 'morning-2',   time: '10:30 AM', label: 'Mid Morning',     available: true  },
    { id: 'afternoon-2', time: '2:00 PM',  label: 'Early Afternoon', available: true  },
    { id: 'afternoon-3', time: '3:30 PM',  label: 'Mid Afternoon',   available: true  },
    { id: 'evening-1',   time: '5:00 PM',  label: 'Evening',         available: true  },
  ];

  const go = (n: number) => {
    setTransitionKey(k => k + 1);
    setStep(n);
    setSubStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitRequest = async () => {
    if (!user) {
      saveResumeAfterAuth('trades', {
        step,
        subStep,
        transitionKey,
        selectedDeviceType,
        selectedBrand,
        selectedDeviceId: selectedDevice?.id ?? null,
        selectedVariant,
        targetProductId,
        notes,
        formData,
        deviceDetails,
        accessories,
      });
      notify('Sign in to submit. Your progress will be restored after you log in.', 'info');
      navigate({ to: '/auth' });
      return;
    }
    if (!selectedDevice || !selectedVariant) { notify('Please select your device', 'error'); return; }
    if (!formData.name || !formData.email || !formData.phone) { notify('Please fill in all contact details', 'error'); return; }
    setSubmitting(true);
    try {
      const accessoriesList = Object.entries(accessories).filter(([,v]) => v).map(([k]) => k);
      const detailsText = `${notes ? notes + '\n\n' : ''}Serial/IMEI: ${deviceDetails.serialNumber || 'N/A'}\nPhysical: ${deviceDetails.physicalDesc || 'N/A'}\nIssues: ${deviceDetails.issueDesc || 'N/A'}\nWhen Started: ${deviceDetails.whenStarted || 'N/A'}\nPrevious Repairs: ${deviceDetails.previousRepairs || 'N/A'}\nAccessories: ${accessoriesList.length ? accessoriesList.join(', ') : 'None'}`;
      const data = await createTradeRequest({
        user_id: user.id,
        user_name: formData.name,
        user_email: formData.email,
        device_brand: selectedDevice.brand,
        device_name: `${selectedDevice.name} — ${selectedVariant}`,
        user_description: detailsText,
        accessories: accessoriesList,
        target_device: targetProduct?.name || '',
        target_product_id: targetProduct?.id || undefined,
        preferred_date: formData.date || undefined,
        preferred_time: timeSlots.find(t => t.id === formData.timeSlot)?.time || '',
        contact_name: formData.name,
        contact_email: formData.email,
        contact_phone: formData.phone,
        fulfillment_method: formData.fulfillmentMethod,
      });

      // The DB trigger gave us a TRD00001-style display_id — pull it
      // straight from the freshly inserted row so the success screen
      // and the "My Requests" sidebar both show it.
      const newTrade: TradeRequest = {
        id: data.id,
        display_id: (data as any).display_id,
        userId: user.id,
        userName: formData.name,
        userEmail: formData.email,
        device: `${selectedDevice.brand} ${selectedDevice.name} — ${selectedVariant}`,
        status: 'Pending',
        date: new Date().toISOString(),
        estimatedValue: 0,
      } as TradeRequest;
      setLastSubmittedTrade(newTrade);
      setMyTrades(prev => [newTrade, ...prev]);
      notify("Trade-in request submitted! We'll review and send you an offer within 24 hours.", 'success');
      go(5);
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

        {/* Pending offer banner */}
        {pendingOffer && (
          <div className="mb-8 bg-gradient-to-r from-purple-500/10 to-[#B38B21]/10 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">🎉 You Have a Trade-In Offer!</p>
                <p className="text-[color:var(--bb-text)] font-black text-lg">{pendingOffer.device}</p>
                {pendingOffer.condition && <p className="text-xs text-[color:var(--bb-muted)] mt-0.5">Condition: <span className="text-[color:var(--bb-text)] font-bold">{pendingOffer.condition}</span></p>}
                {(pendingOffer as any).finalValue && <p className="text-2xl font-black text-[#B38B21] mt-2">${(pendingOffer as any).finalValue} <span className="text-xs text-[color:var(--bb-muted)] font-normal">trade-in value</span></p>}
                {(pendingOffer as any).adminNote && <p className="text-xs text-[color:var(--bb-muted)] mt-1 bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl p-2">{(pendingOffer as any).adminNote}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOfferResponse(pendingOffer.id, true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-black text-xs uppercase rounded-xl hover:bg-green-400 transition-all">
                  <CheckCircle2 size={14} /> Accept
                </button>
                <button onClick={() => handleOfferResponse(pendingOffer.id, false)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-[color:var(--bb-muted)] font-black text-xs uppercase rounded-xl hover:bg-white/20 transition-all">
                  <XCircle size={14} /> Decline
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* ══════════════ MAIN FORM ══════════════ */}
          <div className="flex-1 w-full space-y-6" ref={formRef}>

            {/* ══════════════════════════════════════
                STEP 1 — Device selection
                Mirrors Repair's Step 1 sub-step structure:
                  subStep 1 = device type cards
                  subStep 2 = brand image cards
                  subStep 3 = model selection with preview
            ══════════════════════════════════════ */}

            {/* Folded header when step 1 is done */}
            {step > 1 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Trading In</p>
                  <h3 className="text-xl font-black text-[color:var(--bb-text)]">{selectedDevice?.brand} {selectedDevice?.name} — {selectedVariant}</h3>
                </div>
                <button onClick={() => { setStep(1); setSubStep(1); }} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 active-form-section">

                {/* ── subStep 1a: Device Type ── */}
                {subStep > 1 ? (
                  <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">{DEVICE_TYPES.find(d => d.id === selectedDeviceType)?.label}</h3>
                    <button onClick={() => setSubStep(1)} className="text-sm font-bold text-blue-500 hover:text-blue-400">Change</button>
                  </div>
                ) : subStep === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">What are you trading in?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {DEVICE_TYPES.map(type => (
                        <button key={type.id}
                          onClick={() => {
                            setSelectedDeviceType(type.id);
                            setSelectedBrand('');
                            setSelectedDevice(null);
                            setSelectedVariant('');
                            setSubStep(2);
                          }}
                          className={`flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${selectedDeviceType === type.id
                            ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_30px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          <type.icon size={36} strokeWidth={1.5}
                            className={`mb-4 transition-colors ${selectedDeviceType === type.id ? 'text-[#CDA032]' : 'opacity-60'}`} />
                          <span className={`text-sm sm:text-base font-bold transition-colors ${selectedDeviceType === type.id ? 'text-[#CDA032]' : 'opacity-90'}`}>
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── subStep 1b: Brand (image cards — same as Repair) ── */}
                {subStep > 2 ? (
                  <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">{selectedBrand}</h3>
                    <button onClick={() => setSubStep(2)} className="text-sm font-bold text-blue-500 hover:text-blue-400">Change</button>
                  </div>
                ) : subStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                          {DEVICE_TYPES.find(d => d.id === selectedDeviceType)?.label}
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">Which brand?</h2>
                      </div>
                      <button onClick={() => setSubStep(1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--bb-muted)] hover:text-[#CDA032] transition-colors">
                        <ArrowLeft size={14} /> Back
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {brandsForType.map(brand => (
                        <button key={brand.id}
                          onClick={() => {
                            setSelectedBrand(brand.id);
                            setSelectedDevice(null);
                            setSelectedVariant('');
                            setSubStep(3);
                          }}
                          className={`group flex flex-col items-center justify-center p-6 rounded-3xl border transition-all duration-300 ${selectedBrand === brand.id
                            ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_30px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          <div className="h-16 mb-4 flex items-center justify-center overflow-hidden">
                            <img src={brand.img} alt={brand.label}
                              className={`h-full w-auto object-contain transition-all duration-500 scale-90 group-hover:scale-105 ${selectedBrand === brand.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />
                          </div>
                          <span className={`text-xs font-black uppercase tracking-widest text-center ${selectedBrand === brand.id ? 'text-[#CDA032]' : 'text-[color:var(--bb-muted)]'}`}>
                            {brand.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── subStep 1c: Model selection with preview (same as Repair) ── */}
                {subStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                          {DEVICE_TYPES.find(d => d.id === selectedDeviceType)?.label} · {selectedBrand}
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">Select your device & model</h2>
                      </div>
                      <button onClick={() => setSubStep(2)} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--bb-muted)] hover:text-[#CDA032] transition-colors">
                        <ArrowLeft size={14} /> Back
                      </button>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Left: preview card — mirrors Repair's iPhone preview */}
                      <div className="lg:w-52 shrink-0">
                        <div className={`sticky top-28 rounded-3xl border p-5 flex flex-col items-center gap-3 transition-all duration-500 ${selectedVariant
                          ? 'border-[#CDA032]/50 bg-[#CDA032]/5 shadow-[0_0_50px_rgba(205,160,50,0.15)]'
                          : 'border-[var(--bb-border)] bg-[var(--bb-surface)]'}`}>
                          <div className={`transition-all duration-500 ${selectedVariant ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`} style={{ height: 160 }}>
                            <img
                              src={selectedDevice?.img || (BRANDS_WITH_IMGS.find(b => b.id === selectedBrand)?.img || '/other_device.png')}
                              alt={selectedDevice?.name || 'Device'}
                              className="h-full w-auto object-contain drop-shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
                            />
                          </div>
                          <div className="text-center">
                            {selectedVariant ? (
                              <>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032]/60 mb-0.5">Selected</p>
                                <p className="text-sm font-black text-[#CDA032] leading-tight">{selectedVariant}</p>
                              </>
                            ) : (
                              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Pick a model →</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: device cards then variant chips */}
                      <div className="flex-1 flex flex-col gap-6">
                        {/* Device model cards */}
                        {devicesForBrand.length > 1 && (
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]/70 mb-3">
                              {selectedDevice ? 'Selected Device' : 'Choose Device'}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {devicesForBrand.map(dev => (
                                <button key={dev.id}
                                  onClick={() => { setSelectedDevice(dev); setSelectedVariant(''); }}
                                  className={`relative flex flex-col items-center gap-2 p-3 pt-4 rounded-2xl border transition-all duration-200 group ${selectedDevice?.id === dev.id
                                    ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_16px_rgba(205,160,50,0.2)] ring-1 ring-[#CDA032]'
                                    : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                                >
                                  <img src={dev.img} alt={dev.name}
                                    className={`h-10 w-auto object-contain transition-all duration-200 ${selectedDevice?.id === dev.id ? 'scale-110 drop-shadow-lg' : 'opacity-60 group-hover:opacity-90 group-hover:scale-105'}`} />
                                  <p className={`text-[11px] font-black leading-tight text-center ${selectedDevice?.id === dev.id ? 'text-[#CDA032]' : ''}`}>
                                    {dev.name}
                                  </p>
                                  {selectedDevice?.id === dev.id && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#CDA032] flex items-center justify-center">
                                      <Check size={9} className="text-black" strokeWidth={4} />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Auto-select if only one device for this brand+type */}
                        {devicesForBrand.length === 1 && !selectedDevice && (() => {
                          setSelectedDevice(devicesForBrand[0]);
                          return null;
                        })()}

                        {/* Variant chips — shown once a device is selected */}
                        {selectedDevice && (
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]/70 mb-3">Select Model</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1"
                              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(205,160,50,0.3) transparent' }}>
                              {selectedDevice.variants.map(v => (
                                <button key={v} onClick={() => setSelectedVariant(v)}
                                  className={`relative py-3 px-3 rounded-xl border text-xs font-bold text-left transition-all ${selectedVariant === v
                                    ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] ring-1 ring-[#CDA032]'
                                    : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40 opacity-70 hover:opacity-100'}`}>
                                  {v}
                                  {selectedVariant === v && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#CDA032] flex items-center justify-center">
                                      <Check size={9} className="text-black" strokeWidth={4} />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Continue button */}
                        <div className="pt-2 border-t border-[var(--bb-border)]/50">
                          <button
                            onClick={() => {
                              if (!selectedDevice) { notify('Please select a device', 'error'); return; }
                              if (!selectedVariant) { notify('Please select a model', 'error'); return; }
                              go(2);
                            }}
                            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full"
                          >
                            Continue <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 2 — Trade-in details
                (mirrors Repair's Step 2 "issues & condition")
            ══════════════════════════════════════ */}
            {step > 2 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Device Details</p>
                  <h3 className="text-xl font-black text-[color:var(--bb-text)]">{targetProduct ? `Upgrading to ${targetProduct.name}` : 'Details recorded'}</h3>
                </div>
                <button onClick={() => setStep(2)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">Change</button>
              </div>
            ) : step === 2 && (
              <div key={`step-2-${transitionKey}`} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 active-form-section">

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Tell us about your {selectedDevice?.name}</h2>
                  <p className="opacity-60 text-sm">The more detail you give, the better offer we can make.</p>
                </div>

                {/* Upgrade target */}
                <div>
                  <h3 className="text-base font-bold mb-1">What would you like to upgrade to?</h3>
                  <p className="text-xs text-[color:var(--bb-muted)] mb-4">Optional — helps us tailor the offer.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[min(52vh,28rem)] overflow-y-auto pr-0.5">
                    <button onClick={() => setTargetProductId('')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${!targetProductId
                        ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-60 hover:opacity-100'}`}>
                      Not sure yet
                    </button>
                    {upgradeProducts.map(p => (
                      <button key={p.id} onClick={() => setTargetProductId(p.id)}
                        className={`flex flex-col items-center py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${targetProductId === p.id
                          ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                          : 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-60 hover:opacity-100'}`}>
                        {p.image && <img src={p.image} alt={p.name} className="h-8 w-auto object-contain mb-1.5" />}
                        <span className="text-[10px] leading-tight">{p.name}</span>
                        <span className="text-[#CDA032] font-black mt-0.5">${p.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Device condition — mirrors Repair's "tell us more" section */}
                <div className="space-y-4 p-5 rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold tracking-tight">Device Condition</h3>
                    <Info size={16} className="text-[#CDA032] opacity-50 transition-opacity hover:opacity-100" />
                  </div>
                  <p className="text-xs opacity-60 font-medium">Describe the current state of your device honestly — this helps us give you the best offer.</p>

                  <input type="text" placeholder="Serial / IMEI Number (Optional)"
                    value={deviceDetails.serialNumber}
                    onChange={e => setDeviceDetails({ ...deviceDetails, serialNumber: e.target.value })}
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 focus:ring-1 focus:ring-[#CDA032]/20" />

                  <textarea rows={3} placeholder="Physical description — scratches, cracks, dents, screen condition?"
                    value={deviceDetails.physicalDesc}
                    onChange={e => setDeviceDetails({ ...deviceDetails, physicalDesc: e.target.value })}
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 focus:ring-1 focus:ring-[#CDA032]/20 resize-none leading-relaxed" />

                  <textarea rows={2} placeholder="Any faults or issues? (e.g. battery drains fast, camera broken)"
                    value={deviceDetails.issueDesc}
                    onChange={e => setDeviceDetails({ ...deviceDetails, issueDesc: e.target.value })}
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 focus:ring-1 focus:ring-[#CDA032]/20 resize-none" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="When did issues start? (e.g. 2 months ago)"
                      value={deviceDetails.whenStarted}
                      onChange={e => setDeviceDetails({ ...deviceDetails, whenStarted: e.target.value })}
                      className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                    <input type="text" placeholder="Any previous repairs?"
                      value={deviceDetails.previousRepairs}
                      onChange={e => setDeviceDetails({ ...deviceDetails, previousRepairs: e.target.value })}
                      className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                  </div>

                  <div className="pt-2">
                    <p className="text-xs opacity-60 font-medium mb-3">Accessories Included</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries({ chargers: 'Charger', caseCover: 'Case / Cover', cables: 'Cables', memory: 'Memory Card', other: 'Other' }) as [keyof typeof accessories, string][]).map(([k, label]) => (
                        <button key={k}
                          onClick={() => setAccessories({ ...accessories, [k]: !accessories[k] })}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${accessories[k]
                            ? 'bg-[#CDA032]/10 border-[#CDA032] text-[#CDA032]'
                            : 'bg-[var(--bb-surface)] border-[var(--bb-border)] opacity-70 hover:opacity-100'}`}>
                          {accessories[k] && <Check size={12} />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional notes */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold tracking-tight">Additional Notes (Optional)</h3>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Anything else we should know about the device..."
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none leading-relaxed" />
                </div>

                <div className="pt-8">
                  <button onClick={() => go(3)}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all">
                    Continue to Booking <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 3 — Schedule & Contact
                (mirrors Repair's Step 3)
            ══════════════════════════════════════ */}
            {step > 3 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Booking Details</p>
                  <h3 className="text-xl font-black text-[color:var(--bb-text)]">
                    {formData.date} at {timeSlots.find(t => t.id === formData.timeSlot)?.time}
                  </h3>
                </div>
                <button onClick={() => setStep(3)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">Change</button>
              </div>
            ) : step === 3 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 active-form-section">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Schedule your drop-off or pickup</h2>
                    <p className="opacity-60 text-sm">Choose how you'd like to get your device to us.</p>
                  </div>

                  {/* Fulfillment method */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#CDA032]">How will we receive your device?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'Headquarters', label: 'Bring to Headquarters', desc: 'No service fee', icon: MapPin, badge: 'Recommended' },
                        { id: 'Pickup',       label: 'Request Pickup',        desc: 'Convenient service', icon: Package, badge: null },
                      ].map(method => (
                        <button key={method.id}
                          onClick={() => setFormData({ ...formData, fulfillmentMethod: method.id as any })}
                          className={`flex flex-col p-4 rounded-2xl border transition-all ${formData.fulfillmentMethod === method.id
                            ? 'border-[#CDA032] bg-[#CDA032]/10 ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)]'}`}>
                          <div className="flex items-center justify-between w-full mb-3">
                            <method.icon size={18} className={formData.fulfillmentMethod === method.id ? 'text-[#CDA032]' : 'opacity-50'} />
                            {method.badge && <span className="text-[9px] font-black uppercase tracking-widest bg-[#CDA032] text-black px-2 py-0.5 rounded-full">{method.badge}</span>}
                          </div>
                          <span className={`text-sm font-bold text-left ${formData.fulfillmentMethod === method.id ? 'text-[#CDA032]' : ''}`}>{method.label}</span>
                          <span className="text-[10px] opacity-60 mt-1 text-left">{method.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Date</h3>
                      <div className="relative">
                        <input type="date" value={formData.date}
                          onChange={e => setFormData({ ...formData, date: e.target.value })}
                          onClick={e => (e.target as any).showPicker?.()}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-[var(--bb-border)] rounded-xl pl-12 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 cursor-pointer h-[54px]"
                          style={{ colorScheme: isDark ? 'dark' : 'light' }} />
                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CDA032] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Time Slot</h3>
                      <div className="relative">
                        <select value={formData.timeSlot} onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                          className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 appearance-none cursor-pointer h-[54px]">
                          <option value="">Select an available time...</option>
                          {timeSlots.map(t => (
                            <option key={t.id} value={t.id} disabled={!t.available}>
                              {t.time} — {t.available ? t.label : 'Fully Booked'}
                            </option>
                          ))}
                        </select>
                        <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-6 pt-8 border-t border-[var(--bb-border)]">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Your Details</h2>
                    <p className="opacity-60 text-sm">We'll use this to send you your offer and keep you updated.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { placeholder: 'Full Name',    value: formData.name,  key: 'name',  icon: <User size={16} /> },
                      { placeholder: 'Phone Number', value: formData.phone, key: 'phone', icon: <Phone size={16} /> },
                    ].map(f => (
                      <div key={f.key} className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none">{f.icon}</span>
                        <input placeholder={f.placeholder} value={f.value}
                          onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                          className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                      </div>
                    ))}
                    <div className="relative md:col-span-2">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                      <input type="email" placeholder="Email Address" value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />
                    </div>
                    <div className="relative md:col-span-2">
                      <MapPin size={16} className="absolute left-4 top-3.5 opacity-40 pointer-events-none" />
                      <textarea placeholder="Physical Address (required for pickup service)" value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none" />
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
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all">
                    Review Request <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 4 — Review & Submit
                (mirrors Repair's Step 4)
            ══════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 active-form-section">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">Review your request</h2>
                  <p className="opacity-60 text-sm">Our team will assess your device and send you an offer within 24 hours.</p>
                </div>

                <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-[var(--bb-border)] bg-black/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#CDA032]/10 blur-3xl rounded-full" />
                    <div className="flex items-center gap-5">
                      {selectedDevice && (
                        <img src={selectedDevice.img} alt={selectedDevice.name}
                          className="h-20 w-auto object-contain opacity-90 shrink-0 drop-shadow-xl" />
                      )}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-2">Trade-In Device</p>
                        <h3 className="text-2xl font-black">{selectedDevice?.brand} {selectedDevice?.name}</h3>
                        <p className="text-lg opacity-80">{selectedVariant}</p>
                        {targetProduct && <p className="text-sm text-[color:var(--bb-muted)] mt-1">Upgrading to: <span className="text-[color:var(--bb-text)] font-bold">{targetProduct.name}</span></p>}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-4">
                    <div className="flex gap-3 items-start p-4 bg-[#CDA032]/10 rounded-xl">
                      <Info size={16} className="text-[#CDA032] shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed text-[#CDA032] font-semibold">
                        Trade-in value is confirmed after physical assessment. We will never commit you without your explicit approval.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[var(--bb-border)]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Appointment</p>
                        <p className="text-sm font-semibold">{formData.date}</p>
                        <p className="text-sm opacity-80">{timeSlots.find(t => t.id === formData.timeSlot)?.time} · {formData.fulfillmentMethod}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Contact</p>
                        <p className="text-sm font-semibold">{formData.name}</p>
                        <p className="text-sm opacity-80">{formData.phone}</p>
                        <p className="text-sm opacity-80">{formData.email}</p>
                      </div>
                      {(deviceDetails.physicalDesc || deviceDetails.issueDesc) && (
                        <div className="sm:col-span-2 pt-4 border-t border-[var(--bb-border)]/50">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Device Notes</p>
                          <p className="text-sm opacity-80">{[deviceDetails.physicalDesc, deviceDetails.issueDesc].filter(Boolean).join(' · ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 pb-12">
                  <button onClick={submitRequest} disabled={submitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest text-[#111] bg-gradient-to-r from-[#CDA032] to-[#FCE69B] hover:scale-[1.02] shadow-[0_0_30px_rgba(205,160,50,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Submitting...' : <><span>Submit Trade-In Request</span> <Send size={18} /></>}
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 5 — Success
            ══════════════════════════════════════ */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center py-10 sm:py-12">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[color:var(--bb-text)] mb-2">Request Submitted!</h2>
                  {lastSubmittedTrade?.display_id && (
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
                      Reference: {lastSubmittedTrade.display_id}
                    </p>
                  )}
                  <p className="text-sm text-[color:var(--bb-muted)] max-w-sm mx-auto">
                    Our team will review your {selectedDevice?.brand} {selectedDevice?.name} — {selectedVariant} and send a personalised offer to{' '}
                    <span className="text-[color:var(--bb-text)] font-bold">{formData.email}</span>.
                  </p>
                </div>
                <div className="bg-[var(--bb-surface)] border border-[var(--bb-border)] rounded-2xl p-4 text-left max-w-xs mx-auto space-y-2 text-xs text-[color:var(--bb-muted)]">
                  <p className="font-black text-[color:var(--bb-text)] text-sm mb-2">What happens next?</p>
                  {['Our team reviews your request','We inspect & assess the condition','You receive an offer within 24h','Accept or decline — no pressure'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#CDA032] rounded-full flex items-center justify-center text-[8px] text-black font-black shrink-0">{i + 1}</div>
                      {s}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => {
                      // TRD-23: clear the entire wizard so the next request
                      // starts truly fresh. Mirrors the initial state above.
                      setStep(1);
                      setSubStep(1);
                      setSelectedDeviceType('');
                      setSelectedBrand('');
                      setSelectedDevice(null);
                      setSelectedVariant('');
                      setTargetProductId('');
                      setNotes('');
                      setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: '',
                        address: '',
                        date: '',
                        timeSlot: '',
                        fulfillmentMethod: 'Headquarters',
                      });
                      setDeviceDetails({
                        serialNumber: '',
                        physicalDesc: '',
                        issueDesc: '',
                        whenStarted: '',
                        previousRepairs: '',
                      });
                      setAccessories({
                        chargers: false,
                        caseCover: false,
                        cables: false,
                        memory: false,
                        other: false,
                      });
                      setLastSubmittedTrade(null);
                    }}
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

          {/* ══════════════ SIDEBAR ══════════════ */}
          {step > 1 && (
            <div className="hidden lg:block w-[350px] shrink-0 sticky top-32">
              <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-6 border-b border-[var(--bb-border)] pb-4">Trade-In Summary</h3>
                <div className="space-y-6">
                  {/* Device */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                      {(() => {
                        const IconComp = DEVICE_TYPES.find(d => d.id === selectedDeviceType)?.icon as any;
                        return IconComp ? <IconComp size={18} className="text-[#CDA032]" /> : null;
                      })()}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Device</p>
                      <p className="text-sm font-bold">{selectedDevice ? `${selectedDevice.brand} ${selectedDevice.name}` : selectedBrand || '—'}</p>
                      {selectedVariant && <p className="text-xs opacity-60 mt-0.5">{selectedVariant}</p>}
                    </div>
                  </div>

                  {/* Upgrade target */}
                  {step > 2 && targetProduct && (
                    <div className="flex gap-4 animate-in fade-in">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0 overflow-hidden">
                        {targetProduct.image
                          ? <img src={targetProduct.image} alt={targetProduct.name} className="h-full w-auto object-contain" />
                          : <Package size={18} className="text-[#CDA032]" />}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Upgrading To</p>
                        <p className="text-sm font-bold leading-snug">{targetProduct.name}</p>
                        <p className="text-xs text-[#CDA032] font-black">${targetProduct.price}</p>
                      </div>
                    </div>
                  )}

                  {/* Booking */}
                  {step > 3 && formData.date && formData.timeSlot && (
                    <div className="flex gap-4 animate-in fade-in">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-[#CDA032]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Schedule</p>
                        <p className="text-sm font-bold">{formData.date}</p>
                        <p className="text-xs opacity-70 mt-0.5">{timeSlots.find(t => t.id === formData.timeSlot)?.time}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Past trades */}
              {user && myTrades.length > 0 && (
                <div className="mt-4 rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-xl">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-4 border-b border-[var(--bb-border)] pb-4">My Requests</h3>
                  {loadingTrades ? (
                    <p className="text-xs text-[color:var(--bb-muted)] opacity-80">Loading...</p>
                  ) : (
                    <div className="space-y-3">
                      {myTrades.slice(0, 5).map(t => (
                        <div key={t.id} className="border border-[var(--bb-border)] rounded-xl p-3">
                          {t.display_id && (
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#CDA032] mb-1">
                              {t.display_id}
                            </p>
                          )}
                          <p className="text-xs font-black text-[color:var(--bb-text)] truncate">{(t as any).device}</p>
                          <div className="flex items-center justify-between mt-1">
                            <StatusBadge status={t.status} />
                            {(t as any).finalValue && <span className="text-[10px] font-black text-[#CDA032]">${(t as any).finalValue}</span>}
                          </div>
                          {(t.status === 'Awaiting User' || t.status === 'Offer sent' || t.status === 'Offer Made') && (
                            <div className="flex gap-1.5 mt-2">
                              <button onClick={() => handleOfferResponse(t.id, true)}
                                className="flex-1 py-1.5 bg-green-500/20 text-green-400 text-[9px] font-black uppercase rounded-lg hover:bg-green-500/30 transition-all">Accept</button>
                              <button onClick={() => handleOfferResponse(t.id, false)}
                                className="flex-1 py-1.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase rounded-lg hover:bg-red-500/20 transition-all">Decline</button>
                            </div>
                          )}
                          {(t as any).adminNote && (
                            <p className="text-[10px] text-[color:var(--bb-muted)] mt-1.5 bg-white/[0.03] rounded-lg p-2">{(t as any).adminNote}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};