import React, { useState } from 'react';
import {
  Send, Activity, Camera, Cpu, Smartphone, Laptop, Tablet, Gamepad2, Watch, Check,
  ArrowLeft, ArrowRight, Calendar, AlertCircle, Clock, MapPin, Phone, Mail, User,
  Wrench, Package, FileText, CheckCircle2, Image as ImageIcon, ShieldCheck, Zap, Sparkles
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { RepairRequest } from '../types';
import { generateId, formatCurrency } from '../lib/utils';
import { useAppContext } from '../App';
import { ImageUpload } from '../components/ImageUpload';

export const Repair: React.FC = () => {
  const { user, repairs, setRepairs, notify, theme } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    condition: '',
    description: '',
    date: '',
    timeSlot: '',
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    photos: [] as string[],
    urgency: 'standard'
  });

  const submitRepairRequest = () => {
    if (!user) { navigate({ to: '/auth' }); return; }

    // Validation
    if (!formData.deviceType || !formData.brand || !formData.model || !formData.condition) {
      notify('Please complete device details.', 'error');
      return;
    }
    if (formData.description.length < 10) {
      notify('Please provide a detailed issue description (min 10 chars).', 'error');
      return;
    }
    if (!formData.date || !formData.timeSlot) {
      notify('Please select a schedule.', 'error');
      return;
    }
    if (!formData.name || !formData.email || !formData.phone) {
      notify('Please complete all contact details', 'error');
      return;
    }

    const newRepair: RepairRequest = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      device: `${formData.brand} ${formData.model}`,
      issue: formData.description,
      status: 'Received',
      date: new Date().toISOString(),
      imageUrl: formData.photos.length > 0 ? formData.photos[0] : undefined
    };
    setRepairs([newRepair, ...repairs]);
    notify('Repair request submitted successfully!');
    navigate({ to: '/profile' });
  };

  const deviceTypes = [
    { id: 'smartphone', label: 'Smartphone', desc: 'iPhone, Android', icon: Smartphone },
    { id: 'laptop', label: 'Laptop', desc: 'MacBook, Windows', icon: Laptop },
    { id: 'tablet', label: 'Tablet', desc: 'iPad, Android', icon: Tablet },
    { id: 'gaming', label: 'Console', desc: 'PS, Xbox, Switch', icon: Gamepad2 },
    { id: 'smartwatch', label: 'Watch', desc: 'Apple, Galaxy', icon: Watch },
    { id: 'other', label: 'Other', desc: 'Electronics', icon: Cpu }
  ];

  const conditions = [
    { id: 'excellent', label: 'Excellent', desc: 'Minor cosmetic wear only', dot: 'bg-emerald-400' },
    { id: 'good', label: 'Good', desc: 'Slight signs of use', dot: 'bg-blue-400' },
    { id: 'fair', label: 'Fair', desc: 'Noticeable wear and tear', dot: 'bg-amber-400' },
    { id: 'poor', label: 'Poor', desc: 'Significant damage', dot: 'bg-red-400' }
  ];

  const timeSlots = [
    { id: 'morning-1', time: '9:00 AM', label: 'Early Morning', available: true },
    { id: 'morning-2', time: '10:30 AM', label: 'Mid Morning', available: true },
    { id: 'afternoon-1', time: '12:00 PM', label: 'Noon', available: false },
    { id: 'afternoon-2', time: '2:00 PM', label: 'Early Afternoon', available: true },
    { id: 'afternoon-3', time: '3:30 PM', label: 'Mid Afternoon', available: true },
    { id: 'evening-1', time: '5:00 PM', label: 'Evening', available: true },
  ];

  const urgencyLevels = [
    { id: 'standard', label: 'Standard', desc: '2–3 days', price: 0, icon: Package },
    { id: 'express', label: 'Express', desc: '24 hours', price: 50, icon: Wrench },
    { id: 'emergency', label: 'Emergency', desc: 'Same day', price: 150, icon: Activity }
  ];

  const brands = ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Nintendo', 'HP', 'Dell', 'Lenovo', 'Asus', 'Other'];

  const inputClass = "w-full border border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#CDA032]/50 placeholder:text-white/40";
  const inputBg = { backgroundColor: 'var(--bb-surface)' };

  return (
    <div className="min-h-screen pb-32 relative" style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-text)' }}>
      {/* Subtle bg glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 70%)', filter: 'blur(120px)', transform: 'translate(40%, -40%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translate(-40%, 40%)' }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-10 z-10 relative space-y-10 sm:space-y-12">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#CDA032' }}>
                <Activity size={20} className="text-black" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-60">Diagnostics Lab</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-none">Repair Service</h1>
            <p className="text-sm opacity-60 font-medium mt-2 max-w-md">Schedule a professional diagnostic and repair service for your premium devices.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: <ShieldCheck size={14} className="text-emerald-500" />, label: 'Certified Techs' },
              { icon: <Package size={14} style={{ color: '#CDA032' }} />, label: 'Genuine Parts' },
              { icon: <Zap size={14} className="text-amber-500" />, label: 'Fast Turnaround' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--bb-border)] bg-[var(--bb-surface-2)] shadow-sm">
                {b.icon}
                <span className="text-[11px] font-bold tracking-wide opacity-70 uppercase">{b.label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ── Stepper ── */}
        <div className="flex items-center justify-between relative px-2 mb-8">
          <div className="absolute top-[18px] left-0 w-full h-px border-t border-[var(--bb-border)]" />
          <div
            className="absolute top-[18px] left-0 h-px transition-all duration-500 bg-[#CDA032]"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
          {[
            { id: 1, label: 'Device', icon: Smartphone },
            { id: 2, label: 'Issue', icon: AlertCircle },
            { id: 3, label: 'Schedule', icon: Calendar },
            { id: 4, label: 'Contact', icon: User },
            { id: 5, label: 'Review', icon: CheckCircle2 }
          ].map(s => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5 px-1 bg-[var(--bb-bg)]">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border text-xs font-black ${step > s.id
                ? 'text-black border-transparent bg-[#CDA032]'
                : step === s.id
                  ? 'text-[#CDA032] border-[#CDA032] bg-[#CDA032]/10'
                  : 'text-[var(--bb-text)] opacity-40 border-[var(--bb-border)] bg-[var(--bb-surface)]'
                }`}>
                {step > s.id ? <Check size={15} strokeWidth={3} /> : <s.icon size={15} />}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${step >= s.id ? 'opacity-80' : 'opacity-40'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Form Container ── */}
        <div className="max-w-4xl mx-auto items-start">

          <div className="space-y-8">
            {/* Section 1: Device Details */}
            {step === 1 && (
              <section className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#CDA032]/50" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md bg-[#CDA032]">01</span>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Device Information</h2>
                  </div>

                  <div className="space-y-4">
                    <FieldLabel icon={<Smartphone size={11} />} label="Device Category" required />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {deviceTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => setFormData({ ...formData, deviceType: type.id })}
                          className={`relative p-3 rounded-2xl border text-center transition-all duration-300 group ${formData.deviceType === type.id ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_20px_rgba(205,160,50,0.15)]' : 'border-[var(--bb-border)] hover:border-[#CDA032]/40 bg-[var(--bb-surface-2)]'}`}
                        >
                          <type.icon size={20} className={`mx-auto mb-2 transition-colors ${formData.deviceType === type.id ? 'text-[#CDA032]' : 'opacity-50 group-hover:opacity-100'}`} />
                          <p className={`text-[10px] font-bold uppercase tracking-wide transition-colors ${formData.deviceType === type.id ? 'text-[#CDA032]' : 'opacity-80'}`}>{type.label}</p>
                          <p className="text-[8px] opacity-40 mt-1 hidden sm:block">{type.desc}</p>
                          {formData.deviceType === type.id && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center bg-[#CDA032]">
                              <Check size={10} className="text-black" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-2">
                      <FieldLabel icon={<Package size={11} />} label="Brand" required />
                      <div className="relative">
                        <select
                          value={formData.brand}
                          onChange={e => setFormData({ ...formData, brand: e.target.value })}
                          className={`${inputClass} appearance-none cursor-pointer bg-[var(--bb-surface-2)] border-[var(--bb-border)] text-[var(--bb-text)]`}
                        >
                          <option value="">Select brand...</option>
                          {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ArrowRight size={13} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none rotate-90" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel icon={<FileText size={11} />} label="Model" required />
                      <input
                        placeholder="e.g. iPhone 15 Pro Max"
                        value={formData.model}
                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                        className={`${inputClass} bg-[var(--bb-surface-2)] border-[var(--bb-border)] text-[var(--bb-text)]`}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <FieldLabel icon={<Activity size={11} />} label="Current Condition" required />
                    <div className="grid grid-cols-2 gap-3">
                      {conditions.map(cond => (
                        <button
                          key={cond.id}
                          onClick={() => setFormData({ ...formData, condition: cond.id })}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${formData.condition === cond.id ? 'border-[#CDA032] bg-[#CDA032]/10' : 'border-[var(--bb-border)] bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cond.dot}`} />
                          <div>
                            <p className={`text-xs font-bold transition-colors ${formData.condition === cond.id ? 'opacity-100' : 'opacity-80'}`}>{cond.label}</p>
                            <p className="text-[9px] opacity-50 mt-0.5">{cond.desc}</p>
                          </div>
                          {formData.condition === cond.id && (
                            <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-[#CDA032]">
                              <Check size={9} className="text-black" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-6 border-t border-[var(--bb-border)]">
                  <button
                    onClick={() => {
                      if (!formData.deviceType || !formData.brand || !formData.model || !formData.condition) {
                        notify('Please complete device details.', 'error');
                        return;
                      }
                      setStep(2);
                    }}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] transition-all"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            )}

            {/* Section 2: Issue Description */}
            {step === 2 && (
              <section className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#CDA032]/50" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md bg-[#CDA032]">02</span>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Describe Problem</h2>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      placeholder="Provide a detailed description of the problem (e.g. shattered screen, battery drains fast, won't turn on)..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      className={`${inputClass} resize-none leading-relaxed bg-[var(--bb-surface-2)] border-[var(--bb-border)] text-[var(--bb-text)]`}
                    />
                    <div className="flex justify-between text-[9px] opacity-50">
                      <span>Minimum 10 characters required</span>
                      <span className={formData.description.length >= 10 ? 'text-emerald-500 font-bold' : ''}>{formData.description.length} chars</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <FieldLabel icon={<ImageIcon size={11} />} label="Upload Photos (Optional)" />
                    <ImageUpload
                      images={formData.photos}
                      onImagesChange={photos => setFormData({ ...formData, photos })}
                      maxImages={3}
                      maxSize={5}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-[var(--bb-border)]">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 hover:bg-[var(--bb-surface-2)] transition-all"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (formData.description.length < 10) {
                        notify('Please provide a detailed issue description (min 10 chars).', 'error');
                        return;
                      }
                      setStep(3);
                    }}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] transition-all"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            )}

            {/* Section 3: Scheduling */}
            {step === 3 && (
              <section className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#CDA032]/50" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md bg-[#CDA032]">03</span>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Logistics & Schedule</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <FieldLabel icon={<Clock size={11} />} label="Service Priority" required />
                      <div className="space-y-3">
                        {urgencyLevels.map(level => (
                          <button
                            key={level.id}
                            onClick={() => setFormData({ ...formData, urgency: level.id })}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${formData.urgency === level.id ? 'bg-[#CDA032]/10 border-[#CDA032]' : 'border-[var(--bb-border)] bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                          >
                            <div className="flex items-center gap-3">
                              <level.icon size={16} className={formData.urgency === level.id ? 'text-[#CDA032]' : 'opacity-50'} />
                              <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wide opacity-90">{level.label}</p>
                                <p className="text-[9px] opacity-50">{level.desc}</p>
                              </div>
                            </div>
                            <p className="text-[10px] font-black tracking-widest text-[#CDA032]">
                              {level.price === 0 ? 'FREE' : `+${formatCurrency(level.price)}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <FieldLabel icon={<Calendar size={11} />} label="Preferred Date" required />
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            min={new Date().toISOString().split('T')[0]}
                            className={`${inputClass} pl-12 bg-[var(--bb-surface-2)] border-[var(--bb-border)] text-[var(--bb-text)] cursor-pointer`}
                            style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                          />
                          <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none text-[#CDA032]" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <FieldLabel icon={<MapPin size={11} />} label="Time Slot" required />
                        <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => slot.available && setFormData({ ...formData, timeSlot: slot.id })}
                              disabled={!slot.available}
                              className={`p-3 rounded-xl border text-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${formData.timeSlot === slot.id ? 'bg-[#CDA032]/10 border-[#CDA032]' : 'border-[var(--bb-border)] hover:border-[#CDA032]/30'}`}
                            >
                              <p className="text-xs font-black mb-0.5 opacity-90">{slot.time}</p>
                              <p className="text-[8px] uppercase tracking-wider opacity-50">{slot.available ? slot.label : 'Booked'}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-[var(--bb-border)]">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 hover:bg-[var(--bb-surface-2)] transition-all"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (!formData.date || !formData.timeSlot) {
                        notify('Please select a schedule.', 'error');
                        return;
                      }
                      setStep(4);
                    }}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] transition-all"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            )}

            {/* Section 4: Contact */}
            {step === 4 && (
              <section className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#CDA032]/50" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md bg-[#CDA032]">04</span>
                      <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Owner Contact</h2>
                    </div>
                    {!user && (
                      <button onClick={() => navigate({ to: '/auth' })} className="text-[10px] font-bold text-[#CDA032] underline tracking-widest uppercase">
                        Sign in for faster booking
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 text-[var(--bb-text)]">
                      <FieldLabel icon={<User size={11} />} label="Full Name" required />
                      <input
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className={`${inputClass} bg-[var(--bb-surface-2)] border-[var(--bb-border)]`}
                      />
                    </div>
                    <div className="space-y-2 text-[var(--bb-text)]">
                      <FieldLabel icon={<Phone size={11} />} label="Phone Number" required />
                      <input
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="050 123 4567"
                        className={`${inputClass} bg-[var(--bb-surface-2)] border-[var(--bb-border)]`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-[var(--bb-text)]">
                    <FieldLabel icon={<Mail size={11} />} label="Email Address" required />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className={`${inputClass} bg-[var(--bb-surface-2)] border-[var(--bb-border)]`}
                    />
                  </div>

                  <div className="space-y-2 text-[var(--bb-text)]">
                    <FieldLabel icon={<MapPin size={11} />} label="Pickup Address (Optional)" />
                    <textarea
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Provide address if you want us to pick up the device"
                      rows={2}
                      className={`${inputClass} resize-none bg-[var(--bb-surface-2)] border-[var(--bb-border)]`}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-[var(--bb-border)]">
                  <button
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 hover:bg-[var(--bb-surface-2)] transition-all"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (!formData.name || !formData.email || !formData.phone) {
                        notify('Please complete all contact details', 'error');
                        return;
                      }
                      setStep(5);
                    }}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] transition-all"
                  >
                    Review Details <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            )}

            {/* Section 5: Review & Submit */}
            {step === 5 && (
              <section className="relative rounded-[2.5rem] p-6 md:p-10 space-y-8 border border-[var(--bb-border)] glow-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors border-[#CDA032]/50" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors border-[#CDA032]/50" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl text-xs font-black text-black flex items-center justify-center shadow-md bg-[#CDA032]">05</span>
                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest opacity-80">Request Summary</h2>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Device Details</p>
                        <p className="text-sm font-bold">{formData.brand || formData.model ? `${formData.brand} ${formData.model}` : 'Not Specified'}</p>
                        <p className="text-xs opacity-70 mt-1 capitalize">{formData.deviceType} · Condition: {formData.condition}</p>
                      </div>

                      <div className="p-4 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Schedule</p>
                        <p className="text-sm font-bold">{formData.date ? formData.date : 'Not Specified'}</p>
                        <p className="text-xs opacity-70 mt-1">{formData.timeSlot ? timeSlots.find(t => t.id === formData.timeSlot)?.time : ''} · Priority: <span className="capitalize">{formData.urgency}</span></p>
                      </div>

                      <div className="p-4 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] md:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Contact Info</p>
                        <p className="text-sm font-bold">{formData.name} · {formData.phone}</p>
                        <p className="text-xs opacity-70 mt-1">{formData.email}</p>
                        {formData.address && <p className="text-xs opacity-70 mt-1">{formData.address}</p>}
                      </div>

                      <div className="p-4 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] md:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Issue Description</p>
                        <p className="text-xs leading-relaxed opacity-80">{formData.description || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl border border-[#CDA032]/30 bg-[#CDA032]/5 mt-4">
                      <AlertCircle size={18} className="text-[#CDA032] flex-shrink-0" />
                      <p className="text-[10px] sm:text-xs leading-relaxed opacity-80 font-semibold">
                        Payment is collected only after the diagnostic report is generated and approved by you. We will contact you to confirm the final estimate.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-[var(--bb-border)]">
                    <button
                      onClick={() => setStep(4)}
                      className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 hover:bg-[var(--bb-surface-2)] transition-all w-full sm:w-auto justify-center"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                    <button
                      onClick={submitRepairRequest}
                      className="flex items-center justify-center gap-2 px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] shadow-xl hover:shadow-[#CDA032]/20 transition-all active:scale-95 w-full sm:w-auto"
                    >
                      Submit Repair Ticket <Send size={14} />
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

/* ── Small helper components ── */
const FieldLabel: React.FC<{ icon: React.ReactNode; label: string; required?: boolean }> = ({ icon, label, required }) => (
  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-60">
    <span className="text-[#CDA032]">{icon}</span>
    {label}
    {required && <span className="text-[#CDA032]">*</span>}
  </label>
);