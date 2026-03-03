import React, { useState } from 'react';
import {
  Send, Activity, Camera, Cpu, Smartphone, Laptop, Tablet, Gamepad2, Watch, Check,
  ArrowLeft, ArrowRight, Calendar, AlertCircle, Clock, MapPin, Phone, Mail, User,
  Wrench, Package, FileText, CheckCircle2, Image as ImageIcon, Upload
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { RepairRequest } from '../types';
import { generateId, formatCurrency } from '../lib/utils';
import { useAppContext } from '../App';
import { ImageUpload } from '../components/ImageUpload';

export const Repair: React.FC = () => {
  const { user, repairs, setRepairs, notify } = useAppContext();
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
    { id: 'gaming', label: 'Gaming', desc: 'PS, Xbox, Switch', icon: Gamepad2 },
    { id: 'smartwatch', label: 'Smartwatch', desc: 'Apple, Galaxy', icon: Watch },
    { id: 'other', label: 'Other', desc: 'Other Electronics', icon: Cpu }
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
    { id: 'standard', label: 'Standard', desc: '2–3 business days', price: 0, icon: Package },
    { id: 'express', label: 'Express', desc: '24 hours', price: 50, icon: Wrench },
    { id: 'emergency', label: 'Emergency', desc: 'Same day', price: 150, icon: Activity }
  ];

  const brands = ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Nintendo', 'HP', 'Dell', 'Lenovo', 'Asus', 'Other'];

  const canProceed = () => {
    switch (step) {
      case 1: return formData.deviceType && formData.brand && formData.model && formData.condition;
      case 2: return formData.description.length >= 10;
      case 3: return formData.date && formData.timeSlot;
      case 4: return formData.name && formData.email && formData.phone;
      default: return true;
    }
  };

  const steps = [
    { id: 1, label: 'Device', icon: Smartphone },
    { id: 2, label: 'Issue', icon: AlertCircle },
    { id: 3, label: 'Schedule', icon: Calendar },
    { id: 4, label: 'Contact', icon: User },
    { id: 5, label: 'Confirm', icon: CheckCircle2 }
  ];

  const inputClass = "w-full border border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/40 placeholder:text-white/40";
  const inputBg = { backgroundColor: 'var(--bb-surface)' };

  return (
    <div className="min-h-screen text-white py-8 sm:py-10 px-4 sm:px-6 relative" style={{ backgroundColor: 'var(--bb-bg)' }}>
      {/* Subtle bg glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #B38B21 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translate(-40%, -40%)' }} />
      </div>

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">

        {/* Header */}
        <header className="flex items-center gap-3 pb-6 border-b border-white/10">
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            style={{ backgroundColor: 'var(--bb-surface)' }}
          >
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#B38B21' }}>
            <Wrench size={17} className="text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Repair Service</h1>
            <p className="text-[10px] text-white/60 mt-0.5 font-medium tracking-wide">Professional diagnostics & repairs</p>
          </div>
        </header>

        {/* Stepper */}
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute top-[18px] left-0 w-full h-px border-t border-white/10" />
          <div
            className="absolute top-[18px] left-0 h-px transition-all duration-500"
            style={{ width: `${((step - 1) / 4) * 100}%`, backgroundColor: '#B38B21' }}
          />
          {steps.map(s => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5 px-1" style={{ backgroundColor: 'var(--bb-bg)' }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border text-xs font-black ${step > s.id
                ? 'text-black border-transparent'
                : step === s.id
                  ? 'text-white border-white/20'
                  : 'text-white/50 border-white/6'
                }`} style={{ backgroundColor: step > s.id ? '#B38B21' : step === s.id ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                {step > s.id ? <Check size={15} strokeWidth={3} /> : <s.icon size={15} />}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${step >= s.id ? 'text-white/50' : 'text-white/40'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="rounded-2xl p-6 md:p-8 space-y-8" style={{ backgroundColor: 'var(--bb-surface)' }}>

          {/* ── Step 1: Device ── */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <SectionTitle icon={<Smartphone size={15} />} title="Device Type" required />
                <div className="grid grid-cols-3 gap-2">
                  {deviceTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, deviceType: type.id })}
                      className={`relative p-3 rounded-xl border text-center transition-all duration-200 group ${formData.deviceType === type.id ? 'bg-white/10 border-white/30 shadow-lg' : 'border-white/15'}`}
                    >
                      <type.icon size={18} className={`mx-auto mb-1.5 transition-colors ${formData.deviceType === type.id ? 'text-white' : 'text-white/60 group-hover:text-white/50'}`} />
                      <p className={`text-[10px] font-bold uppercase tracking-wide transition-colors ${formData.deviceType === type.id ? 'text-white' : 'text-white/40'}`}>{type.label}</p>
                      <p className="text-[8px] text-white/50 mt-0.5 hidden sm:block">{type.desc}</p>
                      {formData.deviceType === type.id && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#B38B21' }}>
                          <Check size={9} className="text-black" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div className="space-y-2">
                  <FieldLabel icon={<Package size={11} />} label="Brand" required />
                  <div className="relative">
                    <select
                      value={formData.brand}
                      onChange={e => setFormData({ ...formData, brand: e.target.value })}
                      className={inputClass + " appearance-none cursor-pointer"}
                      style={inputBg}
                    >
                      <option value="">Select brand</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <ArrowRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none rotate-90" />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={<FileText size={11} />} label="Model" required />
                  <input
                    placeholder="e.g., iPhone 15 Pro"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className={inputClass}
                    style={inputBg}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <SectionTitle icon={<Activity size={15} />} title="Device Condition" required />
                <div className="grid grid-cols-2 gap-2">
                  {conditions.map(cond => (
                    <button
                      key={cond.id}
                      onClick={() => setFormData({ ...formData, condition: cond.id })}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${formData.condition === cond.id ? 'bg-white/10 border-white/20 shadow-sm' : 'border-white/10 hover:border-white/15'}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cond.dot}`} />
                      <div>
                        <p className={`text-xs font-bold transition-colors ${formData.condition === cond.id ? 'text-white' : 'text-white/50'}`}>{cond.label}</p>
                        <p className="text-[9px] text-white/50 mt-0.5">{cond.desc}</p>
                      </div>
                      {formData.condition === cond.id && (
                        <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#B38B21' }}>
                          <Check size={9} className="text-black" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Issue ── */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-3">
                <SectionTitle icon={<AlertCircle size={15} />} title="Describe the Issue" required />
                <p className="text-[10px] text-white/60">Provide detailed information about the problem you're experiencing</p>
                <textarea
                  placeholder="Example: Screen is cracked in the top right corner. Touch still works but there's visible damage..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={7}
                  className={inputClass + " resize-none leading-relaxed"}
                  style={inputBg}
                />
                <div className="flex justify-between text-[9px] text-white/50">
                  <span>Minimum 10 characters</span>
                  <span className={formData.description.length >= 10 ? 'text-emerald-400' : ''}>{formData.description.length} chars</span>
                </div>
              </div>

              <div className="space-y-3 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <FieldLabel icon={<ImageIcon size={11} />} label="Add Photos (Optional)" />
                <ImageUpload
                  images={formData.photos}
                  onImagesChange={photos => setFormData({ ...formData, photos })}
                  maxImages={5}
                  maxSize={5}
                />
              </div>

              <div className="space-y-3 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <SectionTitle icon={<Clock size={15} />} title="Service Priority" />
                <div className="grid grid-cols-3 gap-2">
                  {urgencyLevels.map(level => (
                    <button
                      key={level.id}
                      onClick={() => setFormData({ ...formData, urgency: level.id })}
                      className={`p-4 rounded-xl border text-center transition-all duration-200 ${formData.urgency === level.id ? 'bg-white/10 border-white/30 shadow-lg' : 'border-white/10'}`}
                    >
                      <level.icon size={18} className={`mx-auto mb-2 ${formData.urgency === level.id ? 'text-white' : 'text-white/50'}`} />
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${formData.urgency === level.id ? 'text-white' : 'text-white/40'}`}>{level.label}</p>
                      <p className="text-[9px] text-white/50 mb-2">{level.desc}</p>
                      <p className="text-[10px] font-bold" style={{ color: '#B38B21' }}>
                        {level.price === 0 ? 'FREE' : `+${formatCurrency(level.price)}`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Schedule ── */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="space-y-3">
                <SectionTitle icon={<Calendar size={15} />} title="Select Date" required />
                <div className="relative">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className={`${inputClass} pl-12`}
                    style={inputBg}
                  />
                  <Calendar
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <SectionTitle icon={<Clock size={15} />} title="Select Time Slot" required />
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => slot.available && setFormData({ ...formData, timeSlot: slot.id })}
                      disabled={!slot.available}
                      className="p-3 rounded-xl border text-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: formData.timeSlot === slot.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                        borderColor: formData.timeSlot === slot.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <p className={`text-sm font-black mb-0.5 ${formData.timeSlot === slot.id ? 'text-white' : 'text-white/50'}`}>{slot.time}</p>
                      <p className="text-[9px] text-white/50">{slot.available ? slot.label : 'Booked'}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'rgba(179,139,33,0.06)', border: '1px solid rgba(179,139,33,0.15)' }}>
                <AlertCircle size={15} style={{ color: '#B38B21' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white mb-1">Important Note</p>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Our technical staff will contact you to confirm the exact appointment time. Please ensure your contact details are correct.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Contact ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <SectionTitle icon={<User size={15} />} title="Contact Information" />
                <p className="text-[10px] text-white/60 mt-1">We'll use these details to confirm your appointment</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel icon={<User size={11} />} label="Full Name" required />
                  <input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className={inputClass}
                    style={inputBg}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={<Phone size={11} />} label="Phone Number" required />
                  <input
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+233 XX XXX XXXX"
                    className={inputClass}
                    style={inputBg}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel icon={<Mail size={11} />} label="Email Address" required />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className={inputClass}
                  style={inputBg}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel icon={<MapPin size={11} />} label="Address (Optional)" />
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Your pickup/delivery address"
                  rows={3}
                  className={inputClass + " resize-none leading-relaxed"}
                  style={inputBg}
                />
              </div>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(179,139,33,0.1)', border: '1px solid rgba(179,139,33,0.2)' }}>
                  <CheckCircle2 size={28} style={{ color: '#B38B21' }} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-1">Review Your Request</h3>
                <p className="text-[10px] text-white/60">Verify all details before submitting</p>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Device', value: `${formData.brand} ${formData.model}`, icon: Smartphone, editStep: 1 },
                  { label: 'Type', value: deviceTypes.find(d => d.id === formData.deviceType)?.label ?? '—', icon: Package, editStep: 1 },
                  { label: 'Condition', value: conditions.find(c => c.id === formData.condition)?.label ?? '—', icon: Activity, editStep: 1 },
                  { label: 'Priority', value: urgencyLevels.find(u => u.id === formData.urgency)?.label ?? '—', icon: Clock, editStep: 2 },
                  { label: 'Appointment', value: formData.date ? `${formData.date} · ${timeSlots.find(t => t.id === formData.timeSlot)?.time ?? '—'}` : '—', icon: Calendar, editStep: 3 },
                  { label: 'Contact', value: `${formData.name} · ${formData.phone}`, icon: User, editStep: 4 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <item.icon size={15} style={{ color: '#B38B21' }} />
                      <div>
                        <p className="text-[9px] text-white/60 uppercase tracking-wider mb-0.5">{item.label}</p>
                        <p className="text-xs font-semibold text-white">{item.value}</p>
                      </div>
                    </div>
                    <button onClick={() => setStep(item.editStep)} className="text-[9px] font-bold text-white/60 hover:text-white transition-colors uppercase tracking-wider">
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              {formData.description && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[9px] text-white/60 uppercase tracking-wider mb-2">Issue Description</p>
                  <p className="text-xs text-white/60 leading-relaxed">{formData.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Nav Controls */}
          <div className="flex justify-between items-center pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
            >
              <ArrowLeft size={14} /> Back
            </button>

            {step < 5 ? (
              <button
                onClick={() => {
                  if (!canProceed()) { notify('Please complete all required fields', 'error'); return; }
                  setStep(step + 1);
                }}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
                style={{ backgroundColor: '#B38B21' }}
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={submitRepairRequest}
                className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
                style={{ backgroundColor: '#B38B21' }}
              >
                Submit Request <Send size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CheckCircle2, label: 'Certified Technicians', desc: 'Expert repairs' },
            { icon: Package, label: 'Genuine Parts', desc: 'Original components' },
            { icon: Clock, label: 'Fast Service', desc: 'Quick turnaround' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <item.icon size={16} style={{ color: '#B38B21' }} className="flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-white leading-tight">{item.label}</p>
                <p className="text-[9px] text-white/25 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div >
  );
};

/* ── Small helper components ── */
const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; required?: boolean }> = ({ icon, title, required }) => (
  <div className="flex items-center gap-2">
    <span style={{ color: '#B38B21' }}>{icon}</span>
    <h3 className="text-sm font-black uppercase tracking-wider text-white/80">{title}</h3>
    {required && <span style={{ color: '#B38B21' }} className="text-xs">*</span>}
  </div>
);

const FieldLabel: React.FC<{ icon: React.ReactNode; label: string; required?: boolean }> = ({ icon, label, required }) => (
  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
    <span style={{ color: '#B38B21' }}>{icon}</span>
    {label}
    {required && <span style={{ color: '#B38B21' }}>*</span>}
  </label>
);