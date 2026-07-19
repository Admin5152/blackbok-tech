import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send, Activity, Smartphone, Laptop, Tablet, Gamepad2, Watch, Check,
  ArrowLeft, ArrowRight, Calendar, AlertCircle, Clock, MapPin, Phone, Mail, User,
  Wrench, Package, Info, MonitorSmartphone, ChevronRight, CheckCircle2, XCircle
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { RepairRequest } from '../types';
import { useAppContext } from '../App';
import { ImageUpload } from '../components/ImageUpload';
import { getEffectiveRepairPricing } from '../lib/repairPricingStore';
import {
  type RepairIssueKey,
  supportsAppleComponentPricing,
  getIssuesForDevice,
  filterAppleIssuesForModel,
  getIssueLabel,
  getAppleIssuePrice,
  isRepairIssueKey,
  issueKeysNeedDetail,
  getQuickTagsForIssues,
  getAccessoryOptions,
  getSerialFieldLabel,
} from '../lib/repairIssueCatalog';
import { buildRepairDeviceFields, PRICING_MODE } from '../lib/repairDeviceTypes';
import {
  buildAppleIphoneSeriesGroups,
  getIphoneModelImage,
  isAppleIphoneRepairFlow,
  repairModelPickerSubStep,
} from '../lib/repairAppleModels';
import {
  formatRepairEstimateDisplay,
  sumRepairMatrixTotal,
} from '../lib/repairEstimates';
import {
  REPAIR_TIME_SLOTS,
  REPAIR_URGENCY_LEVELS,
  getRepairTimeSlot,
  getRepairUrgencyLevel,
} from '../data/repairBooking';
import { createRepairRequest, updateRepairRequest, REPAIR_REQUEST_CONSTRAINT_MESSAGE } from '../lib/api';
import { saveResumeAfterAuth, peekRestorePayload, clearRestorePayload } from '../lib/resumeAfterAuth';
import { saveReturnTo } from '../lib/returnTo';
import { PageBackButton } from '../components/PageBackButton';
import { BrandLogo } from '../components/BrandLogo';
import { getBrandsForDeviceType } from '../data/deviceBrands';

export const Repair: React.FC = () => {
  const { user, repairs, setRepairs, notify, theme } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState(1); // 1=deviceType, 2=brand, 3=model
  const [issuePhase, setIssuePhase] = useState<1 | 2 | 3>(1); // step 2: issues → details → photos
  const [bookingPhase, setBookingPhase] = useState<1 | 2 | 3>(1); // step 3: schedule → contact → device access
  const [transitionKey, setTransitionKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<Set<RepairIssueKey>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [formData, setFormData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    serialImei: '',
    physicalDescription: '',
    description: '',
    whenStarted: '',
    previouslyRepaired: 'no',
    previousRepairDetails: '',
    accessories: {
      charger: false,
      caseCover: false,
      cables: false,
      memorySim: false,
      stylus: false,
      controller: false,
      powerAdapter: false,
      band: false,
      other: false,
    },
    date: '',
    timeSlot: '',
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    devicePassword: '',
    photos: [] as string[],
    urgency: 'standard',
    fulfillmentMethod: 'Headquarters' as 'Headquarters' | 'Pickup',
    diagnosticFee: 'waived' as 'waived' | 'accepted',
    diagnosticFeeAmount: '',
    repairApproval: 'quote' as 'authorize' | 'quote',
    repairApprovalLimit: '',
    dataBackup: 'acknowledges' as 'requests' | 'acknowledges',
    agreesToTerms: false,
    clientSignature: ''
  });

  const formRef = useRef<HTMLDivElement>(null);
  const repairRestoreDone = useRef(false);
  const prevDeviceSelection = useRef({ deviceType: '', brand: '' });

  useEffect(() => {
    if (!user) {
      repairRestoreDone.current = false;
      return;
    }
    if (repairRestoreDone.current) return;

    const payload = peekRestorePayload('repair') as Record<string, unknown> | null;
    if (!payload || typeof payload !== 'object') {
      repairRestoreDone.current = true;
      return;
    }

    clearRestorePayload('repair');
    repairRestoreDone.current = true;

    if (typeof payload.step === 'number' && payload.step >= 1 && payload.step <= 6) setStep(payload.step);
    if (typeof payload.subStep === 'number' && payload.subStep >= 1 && payload.subStep <= 3) setSubStep(payload.subStep);
    if (typeof payload.issuePhase === 'number' && payload.issuePhase >= 1 && payload.issuePhase <= 3) {
      setIssuePhase(payload.issuePhase as 1 | 2 | 3);
    }
    if (typeof payload.bookingPhase === 'number' && payload.bookingPhase >= 1 && payload.bookingPhase <= 3) {
      setBookingPhase(payload.bookingPhase as 1 | 2 | 3);
    }
    if (typeof payload.transitionKey === 'number') setTransitionKey(payload.transitionKey);
    if (typeof payload.selectedSeries === 'string') setSelectedSeries(payload.selectedSeries);
    if (Array.isArray(payload.selectedIssueKeys)) {
      const valid = (payload.selectedIssueKeys as string[]).filter(isRepairIssueKey);
      setSelectedIssueKeys(new Set(valid));
    }
    if (payload.formData && typeof payload.formData === 'object') {
      setFormData((prev) => ({ ...prev, ...(payload.formData as typeof prev), photos: [] }));
    }
    notify('Your repair draft was restored. Re-attach photos if you had added any.', 'success');
  }, [user, notify]);

  useEffect(() => {
    // Scroll to the active form section whenever step or substep changes
    if (formRef.current) {
      const activeSection = formRef.current.querySelector('.active-form-section');
      if (activeSection) {
        // We use a small delay to ensure the DOM layout has settled after the conditional render
        setTimeout(() => {
          const offset = 140; // Account for the folded headers above
          const top = activeSection.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }, 80);
      }
    }
  }, [step, subStep, issuePhase, bookingPhase]);

  const usesApplePricing = supportsAppleComponentPricing(
    formData.deviceType,
    formData.brand,
    formData.model,
  );

  useEffect(() => {
    const prev = prevDeviceSelection.current;
    const changed =
      prev.deviceType !== formData.deviceType || prev.brand !== formData.brand;
    if (changed && (prev.deviceType || prev.brand)) {
      setSelectedIssueKeys(new Set());
    }
    prevDeviceSelection.current = {
      deviceType: formData.deviceType,
      brand: formData.brand,
    };
  }, [formData.deviceType, formData.brand]);

  useEffect(() => {
    if (!usesApplePricing || !formData.model) return;
    const allowed = new Set(
      filterAppleIssuesForModel(
        getIssuesForDevice(formData.deviceType, formData.brand),
        formData.model,
      ).map((i) => i.key),
    );
    setSelectedIssueKeys((prev) => {
      const next = new Set([...prev].filter((k) => allowed.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [formData.model, usesApplePricing, formData.deviceType, formData.brand]);

  const matrixCostOpts = useMemo(
    () => ({
      deviceType: formData.deviceType,
      brand: formData.brand,
      model: formData.model,
    }),
    [formData.deviceType, formData.brand, formData.model],
  );

  const getTotalRepairCost = useCallback(
    () => sumRepairMatrixTotal(selectedIssueKeys, matrixCostOpts),
    [selectedIssueKeys, matrixCostOpts],
  );

  const getEstimatedCost = useCallback(
    () =>
      formatRepairEstimateDisplay(selectedIssueKeys, {
        ...matrixCostOpts,
        urgencyId: formData.urgency,
      }),
    [selectedIssueKeys, matrixCostOpts, formData.urgency],
  );

  const toggleIssue = (key: RepairIssueKey) => {
    setSelectedIssueKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const submitRepairRequest = async () => {
    if (!user) {
      saveResumeAfterAuth('repair', {
        step,
        subStep,
        issuePhase,
        bookingPhase,
        transitionKey,
        formData: { ...formData, photos: [] },
        selectedIssueKeys: Array.from(selectedIssueKeys),
        selectedSeries,
      });
      notify('Sign in to submit. Your repair progress will be restored after you log in.', 'info');
      saveReturnTo('/repair');
      navigate({ to: '/auth', search: { returnTo: '/repair' } as any });
      return;
    }
    if (submitting) return;
    const selectedLabels = Array.from(selectedIssueKeys).map(getIssueLabel);
    const accessoriesList = Object.entries(formData.accessories).filter(([_, v]) => v).map(([k]) => k).join(', ');
    const effectiveSignature = (formData.clientSignature || formData.name || user.name || '').trim();
    const issueText = `
Diagnostics: ${selectedLabels.join(', ') || 'N/A'}
Description: ${formData.description || 'N/A'}
When Started: ${formData.whenStarted || 'N/A'}
Previously Repaired: ${formData.previouslyRepaired === 'yes' ? formData.previousRepairDetails : 'No'}

[Device Condition]
Serial/IMEI: ${formData.serialImei || 'N/A'}
Physical Description: ${formData.physicalDescription || 'N/A'}
Accessories: ${accessoriesList || 'None'}
Device Password: ${formData.devicePassword || 'None provided'}

[Authorization & Terms]
Diagnostic Fee: ${formData.diagnosticFee === 'accepted' ? 'Accepted (GHC ' + formData.diagnosticFeeAmount + ')' : 'Waived'}
Repair Cost Auth: ${formData.repairApproval === 'authorize' ? 'Authorized up to GHC ' + formData.repairApprovalLimit : 'Require Quote'}
Data Backup: ${formData.dataBackup === 'requests' ? 'Client Requests Backup' : 'Client acknowledges data loss'}
Signed by: ${effectiveSignature || 'N/A'} (Agreed: ${formData.agreesToTerms ? 'Yes' : 'No'})
    `.trim();

    const matrixAmount =
      usesApplePricing && getTotalRepairCost() > 0 ? getTotalRepairCost() : 0;
    const deviceFields = buildRepairDeviceFields({
      deviceType: formData.deviceType,
      brand: formData.brand,
      model: formData.model,
      matrixEstimateAmount: matrixAmount,
    });
    if (deviceFields.ok === false) {
      notify(deviceFields.message, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createRepairRequest({
        user_id: user.id,
        user_name: formData.name || user.name,
        device_brand: formData.brand,
        device_model: formData.model,
        device_type: deviceFields.device_type,
        pricing_mode: deviceFields.pricing_mode,
        issue_type: Array.from(selectedIssueKeys).map(getIssueLabel).join(', ') || 'General Diagnostics',
        issue_description: issueText,
        image_urls: formData.photos.length > 0 ? formData.photos : [],
        accessories: Object.entries(formData.accessories).filter(([, v]) => v).map(([k]) => k),
        urgency: formData.urgency,
        ai_diagnosis: '',
        fulfillment_method: formData.fulfillmentMethod,
        preferred_date: formData.date || undefined,
        preferred_time: getRepairTimeSlot(formData.timeSlot)?.time || undefined,
        contact_name: formData.name || user.name,
        contact_phone: formData.phone || undefined,
        contact_email: formData.email || user.email || undefined,
        repair_approval: formData.repairApproval,
        data_backup: formData.dataBackup,
        diagnostic_fee: formData.diagnosticFee,
        agrees_to_terms: formData.agreesToTerms,
        client_signature: effectiveSignature || undefined,
        estimated_cost:
          deviceFields.pricing_mode === PRICING_MODE.APPLE_MATRIX && matrixAmount > 0
            ? matrixAmount
            : undefined,
      });
      const newRepair: RepairRequest = {
        ...created,
        issue: issueText,
        date: created.date || new Date().toISOString(),
      };
      setRepairs([newRepair, ...repairs]);
      const refLabel = created.display_id ? ` (${created.display_id})` : '';
      notify(`Repair request submitted${refLabel}! We’ll review and confirm your booking.`, 'success');
      navigate({ to: '/profile' });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message === REPAIR_REQUEST_CONSTRAINT_MESSAGE
          ? err.message
          : `Submission failed: ${err instanceof Error ? err.message : 'Please try again'}`;
      notify(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const go = (n: number) => {
    setTransitionKey(k => k + 1);
    setStep(n);
    setSubStep(1);
    if (n === 2) setIssuePhase(1);
    if (n === 3) setBookingPhase(1);
  };

  const needsDetailedIssueDescription = () => issueKeysNeedDetail(selectedIssueKeys);

  const validateIssueDescription = (): boolean => {
    if (!needsDetailedIssueDescription()) return true;
    if (formData.description.trim().length >= 5) return true;
    notify('Please provide details about the issue so our technicians can help.', 'error');
    return false;
  };

  const advanceIssuePhase = (next: 2 | 3) => {
    setIssuePhase(next);
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const advanceBookingPhase = (next: 2 | 3) => {
    setBookingPhase(next);
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateBookingSchedule = (): boolean => {
    if (!formData.date || !formData.timeSlot) {
      notify('Please select a date and time slot.', 'error');
      return false;
    }
    return true;
  };

  const validateBookingContact = (): boolean => {
    if (!formData.name?.trim() || !formData.phone?.trim() || !formData.email?.trim()) {
      notify('Please fill in your name, phone, and email.', 'error');
      return false;
    }
    return true;
  };

  const modelPickerSubStep = () =>
    repairModelPickerSubStep(formData.deviceType, formData.brand);

  const undoToDeviceTypeStep = () => {
    setFormData((f) => ({ ...f, brand: '', model: '' }));
    setSelectedSeries('');
    setSubStep(1);
    setTransitionKey((k) => k + 1);
  };

  const reopenModelPickerKeepTypeBrand = () => {
    const target = modelPickerSubStep();
    setFormData((f) => ({ ...f, model: '' }));
    setSelectedSeries('');
    setSubStep(target);
    setTransitionKey((k) => k + 1);
  };

  const changeDeviceTypeSection = () => {
    const applePhone = isAppleIphoneRepairFlow(formData.deviceType, formData.brand);
    const mps = applePhone ? 4 : 3;
    if (subStep >= mps && formData.deviceType && formData.brand) {
      reopenModelPickerKeepTypeBrand();
      return;
    }
    if (applePhone && subStep === 3) {
      setFormData((f) => ({ ...f, brand: '', model: '' }));
      setSelectedSeries('');
      setSubStep(1);
      setTransitionKey((k) => k + 1);
      return;
    }
    if (subStep === 2 && formData.deviceType) {
      setFormData((f) => ({ ...f, brand: '', model: '' }));
      setSelectedSeries('');
      setSubStep(1);
      setTransitionKey((k) => k + 1);
      return;
    }
    setFormData((f) => ({ ...f, brand: '', model: '' }));
    setSelectedSeries('');
    setSubStep(1);
    setTransitionKey((k) => k + 1);
  };

  const changeBrandSection = () => {
    setFormData((f) => ({ ...f, brand: '', model: '' }));
    setSelectedSeries('');
    setSubStep(2);
    setTransitionKey((k) => k + 1);
  };

  const reopenDeviceWizardFromLaterStep = () => {
    setStep(1);
    if (formData.deviceType && formData.brand) {
      setFormData((f) => ({ ...f, model: '' }));
      setSelectedSeries('');
      setSubStep(modelPickerSubStep());
    } else if (formData.deviceType) {
      setFormData((f) => ({ ...f, brand: '', model: '' }));
      setSelectedSeries('');
      setSubStep(2);
    } else {
      setFormData((f) => ({ ...f, deviceType: '', brand: '', model: '' }));
      setSelectedSeries('');
      setSubStep(1);
    }
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRepairStep = (n: number) => {
    setStep(n);
    if (n === 2) setIssuePhase(1);
    if (n === 3) setBookingPhase(1);
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deviceTypes = [
    { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'laptop', label: 'Laptop', icon: Laptop },
    { id: 'gaming', label: 'Console', icon: Gamepad2 },
    { id: 'smartwatch', label: 'Watch', icon: Watch },
    { id: 'other', label: 'Other', icon: MonitorSmartphone },
  ];

  const brandsForType = useMemo(
    () => getBrandsForDeviceType(formData.deviceType),
    [formData.deviceType],
  );

  const urgencyLevels = useMemo(
    () =>
      REPAIR_URGENCY_LEVELS.map((level) => ({
        ...level,
        icon: level.id === 'standard' ? Package : level.id === 'express' ? Wrench : Activity,
      })),
    [],
  );

  const isAppleIphoneFlow = isAppleIphoneRepairFlow(formData.deviceType, formData.brand);

  const modelOptions = useMemo(
    () => (isAppleIphoneFlow ? Object.keys(getEffectiveRepairPricing()) : []),
    [isAppleIphoneFlow],
  );

  const appleSeriesGroups = useMemo(
    () => (isAppleIphoneFlow ? buildAppleIphoneSeriesGroups(modelOptions) : {}),
    [isAppleIphoneFlow, modelOptions],
  );

  const availableIssues = React.useMemo(() => {
    const base = getIssuesForDevice(formData.deviceType, formData.brand);
    if (usesApplePricing) {
      return filterAppleIssuesForModel(base, formData.model);
    }
    return base;
  }, [formData.deviceType, formData.brand, formData.model, usesApplePricing]);

  const serialFieldLabel = getSerialFieldLabel(formData.deviceType);
  const accessoryOptions = getAccessoryOptions(formData.deviceType);
  const quickTags = getQuickTagsForIssues(selectedIssueKeys);

  const selectedTimeSlot = getRepairTimeSlot(formData.timeSlot);
  const selectedUrgency = getRepairUrgencyLevel(formData.urgency);

  const pendingRepairEstimate = repairs.find((r) => r.status === 'Estimate Sent');

  const handleRepairEstimateResponse = async (repairId: string, accept: boolean) => {
    try {
      const status = accept ? 'In Repair' : 'Rejected';
      await updateRepairRequest(repairId, { status });
      setRepairs(repairs.map((r) => (r.id === repairId ? { ...r, status } : r)));
      notify(
        accept ? 'Estimate approved — we will proceed with the repair.' : 'Repair estimate declined.',
        accept ? 'success' : 'info',
      );
    } catch (err: any) {
      notify(err?.message || 'Could not update repair.', 'error');
    }
  };

  return (
    <div className="min-h-screen pb-32 relative" style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-text)' }}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 60%)', filter: 'blur(100px)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #CDA032 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translate(-30%, 30%)' }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pt-8 sm:pt-14 z-10 relative">

        {/* Header */}
        <header className="mb-10 sm:mb-16 reveal-on-scroll">
          <div className="mb-6">
            <PageBackButton isLight={theme === 'light'} fallbackTo="/" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#CDA032]/10 border border-[#CDA032]/30">
              <Wrench size={20} className="text-[#CDA032]" />
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#CDA032]">BlackBox Repair Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[1.1]">
            Get your device<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CDA032] to-[#FCE69B]">working beautifully.</span>
          </h1>
        </header>

        {pendingRepairEstimate && (
          <div className="mb-8 bg-gradient-to-r from-orange-500/10 to-[#B38B21]/10 border border-orange-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Repair estimate ready</p>
                <p className="text-white font-black text-lg">{pendingRepairEstimate.device}</p>
                {pendingRepairEstimate.estimatedCost && (
                  <p className="text-2xl font-black text-[#B38B21] mt-2">
                    {pendingRepairEstimate.estimatedCost}{' '}
                    <span className="text-xs text-white/40 font-normal">authorized quote</span>
                  </p>
                )}
                {(pendingRepairEstimate as any).adminNote && (
                  <p className="text-xs text-white/50 mt-1 bg-white/5 rounded-xl p-2">{(pendingRepairEstimate as any).adminNote}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRepairEstimateResponse(pendingRepairEstimate.id, true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-black text-xs uppercase rounded-xl hover:bg-green-400 transition-all"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleRepairEstimateResponse(pendingRepairEstimate.id, false)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white/70 font-black text-xs uppercase rounded-xl hover:bg-white/20 transition-all"
                >
                  <XCircle size={14} /> Decline
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* ── Main Form ── */}
          <div className="flex-1 w-full space-y-6" ref={formRef}>

            {/* STEP 1 — Device (sub-stepped) */}
            {step > 1 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Device Details</p>
                  <h3 className="text-xl font-black text-white">{formData.brand} {formData.model}</h3>
                </div>
                <button type="button" onClick={reopenDeviceWizardFromLaterStep} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 active-form-section">

                {/* 1a: Device Type */}
                {subStep > 1 ? (
                  <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">
                      {deviceTypes.find(d => d.id === formData.deviceType)?.label}
                    </h3>
                    <button type="button" onClick={changeDeviceTypeSection} className="text-sm font-bold text-blue-500 hover:text-blue-400">
                      {subStep >= modelPickerSubStep() && formData.deviceType && formData.brand
                        ? 'Change model'
                        : formData.brand === 'Apple' && formData.deviceType === 'smartphone' && subStep === 3
                          ? 'Change category'
                          : 'Change'}
                    </button>
                  </div>
                ) : subStep === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">What can we help you with?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {deviceTypes.map(type => (
                        <button key={type.id}
                          onClick={() => {
                            setFormData({ ...formData, deviceType: type.id, brand: '', model: '' });
                            setSelectedSeries('');
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">{formData.brand}</h3>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={reopenModelPickerKeepTypeBrand}
                        className="text-xs font-bold text-white/40 hover:text-[#CDA032] transition-colors px-2 py-1 rounded-lg border border-transparent hover:border-[#CDA032]/30"
                        title="Keep brand; pick a different model"
                      >
                        Different model
                      </button>
                      <button type="button" onClick={changeBrandSection} className="text-sm font-bold text-blue-500 hover:text-blue-400">
                        Change brand
                      </button>
                    </div>
                  </div>
                ) : subStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                          {deviceTypes.find(d => d.id === formData.deviceType)?.label}
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">Which brand?</h2>
                      </div>
                      <button type="button" onClick={undoToDeviceTypeStep} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#CDA032] transition-colors">
                        <ArrowLeft size={14} /> Back
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {brandsForType.map(brand => (
                        <button key={brand.id}
                          onClick={() => {
                            setFormData({ ...formData, brand: brand.label, model: '' });
                            setSelectedSeries('');
                            setSubStep(3);
                          }}
                          className={`group flex flex-col items-center justify-center p-6 rounded-3xl border transition-all duration-300 ${formData.brand === brand.label
                            ? 'bg-[#CDA032]/10 border-[#CDA032] shadow-[0_0_30px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                        >
                          <div className="h-16 w-full max-w-[7rem] mb-4 flex items-center justify-center px-2">
                            <BrandLogo
                              brand={brand.id}
                              className={`h-12 w-full transition-all duration-500 scale-90 group-hover:scale-105 ${formData.brand === brand.label ? 'opacity-100 text-[#CDA032]' : 'opacity-50 text-[color:var(--bb-text)] group-hover:opacity-90'}`}
                            />
                          </div>
                          <span className={`text-xs font-black uppercase tracking-widest text-center ${formData.brand === brand.label ? 'text-[#CDA032]' : 'text-white/60'}`}>{brand.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) as any}

                {/* 1c: Series (Apple Smartphones Only) */}
                {isAppleIphoneFlow && (
                  subStep > 3 ? (
                    <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                      <h3 className="text-lg font-bold">{selectedSeries}</h3>
                      <button onClick={() => { setSubStep(3); setFormData(f => ({ ...f, model: '' })); setSelectedSeries(''); }} className="text-sm font-bold text-blue-500 hover:text-blue-400">
                        Change
                      </button>
                    </div>
                  ) : subStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                      <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                            {deviceTypes.find(d => d.id === formData.deviceType)?.label} · {formData.brand}
                          </p>
                          <h2 className="text-2xl font-bold tracking-tight">Select your iPhone series</h2>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={() => setSubStep(2)} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#CDA032] transition-colors">
                            <ArrowLeft size={14} /> Back
                          </button>
                          <a
                            href="https://support.apple.com/en-us/108044"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-black text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 transition-colors shrink-0 px-3 py-1.5 rounded-full bg-blue-500/10"
                          >
                            Help identify your model →
                          </a>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start pr-1">
                        {Object.keys(appleSeriesGroups).reverse().map(series => {
                          const img = getIphoneModelImage(series);

                          return (
                            <button key={series}
                              onClick={() => {
                                setSelectedSeries(series);
                                setSubStep(4);
                              }}
                              className={`relative flex flex-col items-center justify-center gap-3 p-4 pt-5 rounded-2xl border transition-all duration-200 group border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40 hover:shadow-[0_0_16px_rgba(205,160,50,0.1)]`}
                            >
                              <img src={img} alt={series}
                                className="h-16 w-auto object-contain transition-all duration-200 opacity-60 group-hover:opacity-90 group-hover:scale-105" />
                              <div className="text-center">
                                <p className="text-[13px] font-black">{series}</p>
                                <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1 group-hover:text-[#CDA032] group-hover:opacity-100 transition-colors">Select Models</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
                {/* 1d: Model Selection */}
                {subStep === (isAppleIphoneFlow ? 4 : 3) && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                          {deviceTypes.find(d => d.id === formData.deviceType)?.label} · {formData.brand} {selectedSeries ? `· ${selectedSeries}` : ''}
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">Select your {formData.brand === 'Apple' ? 'iPhone' : 'specific'} model</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((f) => ({ ...f, model: '' }));
                          setSubStep(isAppleIphoneFlow ? 3 : 2);
                          setTransitionKey((k) => k + 1);
                        }}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#CDA032] transition-colors"
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                    </div>

                    {isAppleIphoneFlow ? (
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: Large phone image preview */}
                        <div className="lg:w-52 shrink-0">
                          <div className={`sticky top-28 rounded-3xl border p-5 flex flex-col items-center gap-3 transition-all duration-500 ${formData.model
                            ? 'border-[#CDA032]/50 bg-[#CDA032]/5 shadow-[0_0_50px_rgba(205,160,50,0.15)]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)]'
                            }`}>
                            {(() => {
                              const m = formData.model;
                              const img = getIphoneModelImage(m || '');
                              return (
                                <div className={`relative transition-all duration-500 ${m ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`}
                                  style={{ height: 160 }}>
                                  <img
                                    key={img}
                                    src={img}
                                    alt={m || 'iPhone'}
                                    className="h-full w-auto object-contain drop-shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
                                  />
                                </div>
                              );
                            })()}
                            <div className="text-center">
                              {formData.model ? (
                                <>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032]/60 mb-0.5">Selected</p>
                                  <p className="text-sm font-black text-[#CDA032] leading-tight">{formData.model}</p>
                                </>
                              ) : (
                                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Select a model →</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Scrollable model list */}
                        <div className="flex-1 flex flex-col gap-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start max-h-[520px] overflow-y-auto pr-1"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(205,160,50,0.3) transparent' }}>
                            {[...appleSeriesGroups[selectedSeries]].reverse().map(model => {
                              const selected = formData.model === model;
                              const num = parseInt(model.replace(/\D/g, '')) || 0;
                              const hasHome = num <= 8 || model.includes('SE');
                              const hasDI = num >= 14;
                              const img = hasHome ? '/iphone_classic.png' : hasDI ? '/iphone_modern.png' : '/iphone_notch.png';

                              return (
                                <button key={model}
                                  onClick={() => setFormData(f => ({ ...f, model }))}
                                  className={`relative flex flex-col items-center gap-2 p-3 pt-4 rounded-2xl border transition-all duration-200 group ${selected
                                    ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_16px_rgba(205,160,50,0.2)] ring-1 ring-[#CDA032]'
                                    : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'
                                    }`}
                                >
                                  <img src={img} alt={model}
                                    className={`h-12 w-auto object-contain transition-all duration-200 ${selected ? 'scale-110 drop-shadow-lg' : 'opacity-60 group-hover:opacity-90 group-hover:scale-105'}`} />
                                  <div className="text-center">
                                    <p className={`text-[11px] font-black leading-tight ${selected ? 'text-[#CDA032]' : ''}`}>
                                      {model.replace('iPhone ', '')}
                                    </p>
                                  </div>
                                  {selected && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#CDA032] flex items-center justify-center">
                                      <Check size={9} className="text-black" strokeWidth={4} />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <div className="space-y-3 pt-4 border-t border-[var(--bb-border)]/50">
                            <h3 className="text-xs font-bold opacity-80 uppercase tracking-widest text-[#CDA032]">Device Specifics</h3>
                            <input placeholder={`${serialFieldLabel} (Optional)`} value={formData.serialImei} onChange={e => setFormData({ ...formData, serialImei: e.target.value })} className="w-full bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm focus:border-[#CDA032] outline-none" />
                            <textarea placeholder="Physical Description (Color, scratches, visible defects)" value={formData.physicalDescription} onChange={e => setFormData({ ...formData, physicalDescription: e.target.value })} rows={2} className="w-full bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm focus:border-[#CDA032] outline-none resize-none" />
                          </div>
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                if (!formData.model) { notify('Please select your model to continue.', 'error'); return; }
                                go(2);
                              }}
                              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full"
                            >
                              Continue <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="p-8 rounded-[2.5rem] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-2xl relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#CDA032]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                          <div className="relative z-10 space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">Model Identification</label>
                            <input
                              placeholder={`Type your ${formData.brand} model name...`}
                              value={formData.model}
                              onChange={e => setFormData({ ...formData, model: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg font-bold outline-none transition-all focus:border-[#CDA032] focus:bg-white/[0.08] placeholder:text-white/20"
                            />
                            <p className="text-[10px] font-medium text-white/40 leading-relaxed uppercase tracking-widest">Please enter the full model name as seen on the device back or in settings.</p>
                          </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-[var(--bb-border)]/50">
                          <h3 className="text-xs font-bold opacity-80 uppercase tracking-widest text-[#CDA032]">Device Specifics (Optional)</h3>
                          <input placeholder={serialFieldLabel} value={formData.serialImei} onChange={e => setFormData({ ...formData, serialImei: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[#CDA032] outline-none" />
                          <textarea placeholder="Physical Description (Color, inscriptions, visible defects)" value={formData.physicalDescription} onChange={e => setFormData({ ...formData, physicalDescription: e.target.value })} rows={2} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[#CDA032] outline-none resize-none" />
                        </div>
                        <button
                          onClick={() => {
                            if (!formData.model) { notify('Please enter your model to continue.', 'error'); return; }
                            go(2);
                          }}
                          className="flex items-center justify-center gap-3 px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full shadow-[0_20px_40px_rgba(205,160,50,0.25)]"
                        >
                          Confirm Model <ArrowRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — Issues & Condition */}
            {step > 2 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Device Issues</p>
                  <h3 className="text-xl font-black text-white">
                    {Array.from(selectedIssueKeys).map(getIssueLabel).join(' + ')}
                  </h3>
                </div>
                <button type="button" onClick={() => openRepairStep(2)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 2 && (
              <div key={`step-2-${transitionKey}-${issuePhase}`} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 active-form-section">

                <nav aria-label="Repair issue steps" className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {([
                    { n: 1 as const, label: 'Select issues' },
                    { n: 2 as const, label: 'More details' },
                    { n: 3 as const, label: 'Photos' },
                  ]).map(({ n, label }, i) => (
                    <React.Fragment key={n}>
                      {i > 0 && <ChevronRight size={14} className="opacity-30 shrink-0" aria-hidden />}
                      <button
                        type="button"
                        disabled={n > issuePhase}
                        onClick={() => {
                          if (n >= issuePhase) return;
                          setIssuePhase(n);
                          setTransitionKey((k) => k + 1);
                        }}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                          issuePhase === n
                            ? 'bg-[#CDA032] text-black'
                            : issuePhase > n
                              ? 'bg-[var(--bb-surface-2)] border border-[var(--bb-border)] opacity-80 hover:border-[#CDA032]/40'
                              : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {label}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>

                {issuePhase === 1 && (
                  <>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">What's happening with your {formData.model}?</h2>
                  <p className="opacity-60 text-sm">
                    {usesApplePricing
                      ? 'Select one or more issues — we will add up the estimates for you.'
                      : 'Select what seems wrong — our team will confirm the exact repair after inspection.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {availableIssues.map((issue) => {
                    const selected = selectedIssueKeys.has(issue.key);
                    const price =
                      usesApplePricing && issue.pricingKey
                        ? getAppleIssuePrice(formData.model, issue.pricingKey)
                        : null;
                    return (
                      <button key={issue.key}
                        onClick={() => toggleIssue(issue.key)}
                        className={`flex flex-col text-left p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden group ${selected
                          ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_20px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                          : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'}`}
                      >
                        <div className="flex justify-between w-full items-start mb-2 z-10">
                          <span className={`font-extrabold text-base sm:text-lg ${selected ? 'text-[#CDA032]' : ''}`}>{issue.label}</span>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-2 ${selected ? 'border-[#CDA032] bg-[#CDA032]' : 'border-[var(--bb-border)] opacity-30 group-hover:opacity-100 group-hover:border-[#CDA032]/50'}`}>
                            {selected && <Check size={11} className="text-black" strokeWidth={4} />}
                          </div>
                        </div>
                        <span className="text-xs opacity-60 leading-relaxed mb-6 z-10 flex-1">{issue.desc}</span>
                        {usesApplePricing && (
                          <div className="w-full pt-4 border-t border-[var(--bb-border)] z-10">
                            {price ? (
                              <div className="flex items-end gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Estimate:</span>
                                <span className="text-lg font-black text-[#CDA032] leading-none">{price.display}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                {issue.key === 'UNKNOWN' ? 'Diagnostic Needed' : 'Custom Quote'}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Running total — Apple iPhone only */}
                {usesApplePricing && selectedIssueKeys.size > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[#CDA032]/30 bg-[#CDA032]/5 animate-in fade-in duration-300">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Selected Services</p>
                      <p className="text-sm font-bold">
                        {Array.from(selectedIssueKeys).map(getIssueLabel).join(' + ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Running Estimate</p>
                      <p className="text-xl font-black text-[#CDA032]">{getEstimatedCost()}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIssueKeys.size === 0) {
                        notify('Please select at least one issue.', 'error');
                        return;
                      }
                      advanceIssuePhase(2);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next: Add details <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}

                {issuePhase === 2 && (
                  <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Tell us more details</h2>
                  <p className="opacity-60 text-sm">Help our technicians understand the problem and what you are bringing in.</p>
                </div>

                    <div className={`space-y-4 p-5 rounded-3xl border-2 transition-all duration-500 ${(() => {
                      const needsDetailedInfo = needsDetailedIssueDescription();
                      const isMissing = needsDetailedInfo && formData.description.trim().length < 5;
                      return isMissing
                        ? 'border-[#CDA032]/30 bg-[#CDA032]/5 shadow-[0_0_20px_rgba(205,160,50,0.05)]'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface-2)]';
                    })()}`}>
                      <div className="flex items-center justify-end gap-2 mb-2">
                          {needsDetailedIssueDescription() && (
                            <span className="text-[9px] font-black bg-[#CDA032] text-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Required</span>
                          )}
                        <Info size={16} className="text-[#CDA032] opacity-50 transition-opacity hover:opacity-100" />
                      </div>

                      <p className="text-xs opacity-60 mb-2 font-medium">
                        {needsDetailedIssueDescription()
                          ? 'Please describe the symptoms so our technicians know what to look for.'
                          : 'Any additional context helps our technicians work faster.'}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {quickTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const current = formData.description;
                              if (!current.includes(tag)) {
                                setFormData({ ...formData, description: current ? `${current}, ${tag}` : tag });
                              }
                            }}
                            className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-[#CDA032]/30 bg-[#CDA032]/5 hover:bg-[#CDA032]/20 hover:border-[#CDA032] transition-all text-[#CDA032]"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <textarea
                          placeholder={needsDetailedIssueDescription()
                            ? 'Please explain the symptoms as best as you can...'
                            : 'Describe the problem in detail'}
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface-2)] outline-none transition-all focus:border-[#CDA032]/50 focus:ring-1 focus:ring-[#CDA032]/20 resize-none leading-relaxed shadow-inner"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            placeholder="When did it start? (e.g. 2 days ago)"
                            value={formData.whenStarted}
                            onChange={e => setFormData({ ...formData, whenStarted: e.target.value })}
                            className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface-2)] outline-none transition-all focus:border-[#CDA032]/50 focus:ring-1 focus:ring-[#CDA032]/20"
                          />
                          <div className="flex bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl p-1 relative">
                            <div className="absolute top-1/2 left-4 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest opacity-60 pointer-events-none">Previously Repaired?</div>
                            <div className="flex flex-1 justify-end gap-1">
                              <button onClick={() => setFormData({ ...formData, previouslyRepaired: 'no' })} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${formData.previouslyRepaired === 'no' ? 'bg-[var(--bb-surface)] text-white shadow' : 'opacity-60 hover:opacity-100'}`}>No</button>
                              <button onClick={() => setFormData({ ...formData, previouslyRepaired: 'yes' })} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${formData.previouslyRepaired === 'yes' ? 'bg-[#CDA032]/20 text-[#CDA032] shadow ring-1 ring-[#CDA032]' : 'opacity-60 hover:opacity-100'}`}>Yes</button>
                            </div>
                          </div>
                        </div>
                        {formData.previouslyRepaired === 'yes' && (
                          <input
                            placeholder="Please describe the previous repairs briefly..."
                            value={formData.previousRepairDetails}
                            onChange={e => setFormData({ ...formData, previousRepairDetails: e.target.value })}
                            className="w-full border border-[#CDA032]/50 rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface-2)] outline-none transition-all focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032]/20 animate-in fade-in"
                          />
                        )}
                        
                        <div className="pt-2">
                          <p className="text-xs opacity-60 font-medium mb-3">Check Included Accessories</p>
                          <div className="flex flex-wrap gap-2">
                            {accessoryOptions.map(acc => (
                              <button
                                key={acc.id}
                                onClick={() => setFormData({ ...formData, accessories: { ...formData.accessories, [acc.id]: !formData.accessories[acc.id] } })}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${formData.accessories[acc.id] ? 'bg-[#CDA032]/10 border-[#CDA032] text-[#CDA032]' : 'bg-[var(--bb-surface-2)] border-[var(--bb-border)] opacity-70 hover:opacity-100'}`}
                              >
                                {formData.accessories[acc.id] && <Check size={12} />}
                                {acc.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                <div className="flex flex-wrap gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIssuePhase(1);
                      setTransitionKey((k) => k + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-[var(--bb-border)] hover:border-[#CDA032]/40 transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateIssueDescription()) return;
                      advanceIssuePhase(3);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next: Photos <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}

                {issuePhase === 3 && (
                  <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Upload photos (optional)</h2>
                  <p className="opacity-60 text-sm">Photos of the damage help our technicians give you a better estimate.</p>
                </div>
                      <ImageUpload
                        images={formData.photos}
                        onImagesChange={photos => setFormData({ ...formData, photos })}
                        maxImages={3}
                        maxSize={5}
                      />

                <div className="flex flex-wrap gap-3 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setIssuePhase(2);
                      setTransitionKey((k) => k + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-[var(--bb-border)] hover:border-[#CDA032]/40 transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIssueKeys.size === 0) {
                        notify('Please select at least one issue.', 'error');
                        setIssuePhase(1);
                        return;
                      }
                      if (!validateIssueDescription()) {
                        setIssuePhase(2);
                        return;
                      }
                      go(3);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Continue to booking <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3 — Schedule & Contact */}
            {step > 3 ? (
              <div className="flex justify-between items-center py-6 border-b border-[var(--bb-border)] animate-in fade-in transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">Booking Details</p>
                  <h3 className="text-xl font-black text-white">
                    {formData.date} at {selectedTimeSlot?.time}
                  </h3>
                </div>
                <button type="button" onClick={() => openRepairStep(3)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 3 && (
              <div key={`step-3-${transitionKey}-${bookingPhase}`} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 active-form-section">

                <nav aria-label="Booking steps" className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {([
                    { n: 1 as const, label: 'Schedule' },
                    { n: 2 as const, label: 'Your details' },
                    { n: 3 as const, label: 'Device access' },
                  ]).map(({ n, label }, i) => (
                    <React.Fragment key={n}>
                      {i > 0 && <ChevronRight size={14} className="opacity-30 shrink-0" aria-hidden />}
                      <button
                        type="button"
                        disabled={n > bookingPhase}
                        onClick={() => {
                          if (n >= bookingPhase) return;
                          setBookingPhase(n);
                          setTransitionKey((k) => k + 1);
                        }}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                          bookingPhase === n
                            ? 'bg-[#CDA032] text-black'
                            : bookingPhase > n
                              ? 'bg-[var(--bb-surface-2)] border border-[var(--bb-border)] opacity-80 hover:border-[#CDA032]/40'
                              : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {label}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>

                {bookingPhase === 1 && (
                  <>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Schedule your drop-off or pickup</h2>
                    <p className="opacity-60 text-sm">Choose how you'd like to get your device to our service center.</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#CDA032]">How will we receive your device?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'Headquarters', label: 'Bring to Headquarters', desc: 'No service fee', icon: MapPin },
                        { id: 'Pickup', label: 'Request Pickup Service', desc: '₵20 service fee', icon: Package },
                      ].map(method => (
                        <button key={method.id}
                          onClick={() => setFormData({ ...formData, fulfillmentMethod: method.id as any })}
                          className={`flex flex-col p-4 rounded-2xl border transition-all ${formData.fulfillmentMethod === method.id
                            ? 'border-[#CDA032] bg-[#CDA032]/10 ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)]'}`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <method.icon size={18} className={formData.fulfillmentMethod === method.id ? 'text-[#CDA032]' : 'opacity-50'} />
                            {method.id === 'Headquarters' && (
                              <span className="text-[9px] font-black uppercase tracking-widest bg-[#CDA032] text-black px-2 py-0.5 rounded-full">Recommended</span>
                            )}
                          </div>
                          <span className={`text-sm font-bold text-left ${formData.fulfillmentMethod === method.id ? 'text-[#CDA032]' : ''}`}>{method.label}</span>
                          <span className="text-[10px] opacity-60 mt-1 text-left">{method.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#CDA032]">Priority Level</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {urgencyLevels.map(level => (
                        <button key={level.id}
                          onClick={() => setFormData({ ...formData, urgency: level.id })}
                          className={`flex flex-col p-4 rounded-2xl border transition-all ${formData.urgency === level.id
                            ? 'border-[#CDA032] bg-[#CDA032]/10 ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)]'}`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <level.icon size={18} className={formData.urgency === level.id ? 'text-[#CDA032]' : 'opacity-50'} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
                              {level.price === 0 ? 'Included' : `+ ₵${level.price}`}
                            </span>
                          </div>
                          <span className={`text-sm font-bold text-left ${formData.urgency === level.id ? 'text-[#CDA032]' : ''}`}>{level.label}</span>
                          <span className="text-[10px] opacity-60 mt-1 text-left">{level.desc} turnaround</span>
                        </button>
                      ))}
                    </div>
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
                          {REPAIR_TIME_SLOTS.map(t => (
                            <option key={t.id} value={t.id} disabled={!t.available}>
                              {t.time} - {t.available ? t.label : 'Fully Booked'}
                            </option>
                          ))}
                        </select>
                        <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateBookingSchedule()) return;
                      advanceBookingPhase(2);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next: Your details <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}

                {bookingPhase === 2 && (
                  <>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Your details</h2>
                    <p className="opacity-60 text-sm">We&apos;ll use this to keep you updated on your repair status.</p>
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
                          onChange={e => setFormData({ ...formData, [f.key as any]: e.target.value })}
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

                <div className="flex flex-wrap gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPhase(1);
                      setTransitionKey((k) => k + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-[var(--bb-border)] hover:border-[#CDA032]/40 transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateBookingContact()) return;
                      advanceBookingPhase(3);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next: Device access <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}

                {bookingPhase === 3 && (
                  <>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">Device access</h2>
                      <p className="opacity-60 text-sm">Optional, but helps our technicians run post-repair diagnostics on your device.</p>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Device Password / PIN (Optional but recommended)"
                        value={formData.devicePassword}
                        onChange={e => setFormData({ ...formData, devicePassword: e.target.value })}
                        className="w-full border border-[var(--bb-border)] rounded-xl pl-10 pr-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50"
                      />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest opacity-40 mt-2 font-bold flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                      Passwords are treated with strict confidentiality
                    </p>
                  </div>

                <div className="flex flex-wrap gap-3 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPhase(2);
                      setTransitionKey((k) => k + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-[var(--bb-border)] hover:border-[#CDA032]/40 transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateBookingSchedule()) {
                        setBookingPhase(1);
                        return;
                      }
                      if (!validateBookingContact()) {
                        setBookingPhase(2);
                        return;
                      }
                      go(4);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Proceed to authorization <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 4 — Review & Confirm */}
            {step === 4 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 active-form-section">

                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">{usesApplePricing ? 'Review your quote' : 'Review your request'}</h2>
                  <p className="opacity-60 text-sm">Please verify your details before submitting the final request.</p>
                </div>

                <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] overflow-hidden shadow-2xl">
                  {/* Banner */}
                  <div className="p-8 border-b border-[var(--bb-border)] bg-black/5 dark:bg-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#CDA032]/10 blur-3xl rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-2">Device &amp; Repair Service</p>
                    <h3 className="text-2xl font-black mb-1">{formData.brand} {formData.model}</h3>
                    <p className="text-lg opacity-80">
                      {selectedIssueKeys.size > 0
                        ? Array.from(selectedIssueKeys).map(getIssueLabel).join(' + ')
                        : 'Diagnostic Request'}
                    </p>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Cost */}
                    <div className="space-y-4">
                      {usesApplePricing ? (
                        <>
                          <div className="flex justify-between items-center text-sm font-medium">
                            <span className="opacity-70">Estimated Repair Cost</span>
                            <span className="font-bold">{getTotalRepairCost() > 0 ? `₵${getTotalRepairCost()}` : 'Post-Diagnostic'}</span>
                          </div>
                          {formData.urgency !== 'standard' && (
                            <div className="flex justify-between items-center text-sm font-medium">
                              <span className="opacity-70 capitalize">{formData.urgency} Priority Level</span>
                              <span className="font-bold">+ ₵{selectedUrgency?.price ?? 0}</span>
                            </div>
                          )}
                          <div className="pt-4 mt-4 border-t border-[var(--bb-border)] flex justify-between items-end">
                            <span className="text-base font-black">Total Estimate</span>
                            <span className="text-3xl font-black text-[#CDA032]">{getEstimatedCost()}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-sm font-medium">
                            <span className="opacity-70">Repair pricing</span>
                            <span className="font-bold">Quote after diagnostic</span>
                          </div>
                          {formData.urgency !== 'standard' && (
                            <div className="flex justify-between items-center text-sm font-medium">
                              <span className="opacity-70 capitalize">{formData.urgency} priority fee</span>
                              <span className="font-bold">+ ₵{selectedUrgency?.price ?? 0}</span>
                            </div>
                          )}
                          <div className="pt-4 mt-4 border-t border-[var(--bb-border)] flex justify-between items-end">
                            <span className="text-base font-black">Total due now</span>
                            <span className="text-3xl font-black text-[#CDA032]">{getEstimatedCost()}</span>
                          </div>
                        </>
                      )}
                      <div className="flex gap-3 items-start p-4 bg-[#CDA032]/10 rounded-xl mt-4">
                        <Info size={16} className="text-[#CDA032] shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-[#CDA032] font-semibold">
                          {usesApplePricing
                            ? 'Final price confirmed after physical diagnostic. We will never charge you without your explicit approval.'
                            : 'We will inspect your device and send a quote before any repair work begins. You approve every charge.'}
                        </p>
                      </div>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[var(--bb-border)]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Appointment</p>
                        <p className="text-sm font-semibold">{formData.date}</p>
                        <p className="text-sm opacity-80">{selectedTimeSlot?.time} · <span className="capitalize">{formData.urgency}</span></p>
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
                      <div className="sm:col-span-2 pt-4 border-t border-[var(--bb-border)]/50">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Notes</p>
                        <p className="text-sm opacity-80">{formData.description || 'No additional details provided.'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- Step 4.B: Diagnostic & Repair Authorization --- */}
                <div className="space-y-6 pt-6">
                  <h3 className="text-xl font-bold tracking-tight">Diagnostic &amp; Repair Authorization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bb-surface)] border border-[var(--bb-border)] p-6 rounded-3xl shadow-lg">
                    {/* Diagnostic Fee */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Diagnostic Fee</h4>
                      <div className="flex bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl p-1 relative h-12">
                        <button onClick={() => setFormData({ ...formData, diagnosticFee: 'waived' })} className={`flex-1 text-xs font-bold rounded-lg transition-all ${formData.diagnosticFee === 'waived' ? 'bg-[#CDA032]/20 text-[#CDA032] shadow ring-1 ring-[#CDA032]' : 'opacity-60 hover:opacity-100'}`}>Waived</button>
                        <button onClick={() => setFormData({ ...formData, diagnosticFee: 'accepted' })} className={`flex-1 text-xs font-bold rounded-lg transition-all ${formData.diagnosticFee === 'accepted' ? 'bg-[#CDA032]/20 text-[#CDA032] shadow ring-1 ring-[#CDA032]' : 'opacity-60 hover:opacity-100'}`}>Accepted</button>
                      </div>
                      {formData.diagnosticFee === 'accepted' && (
                        <input placeholder="Diagnostic Amount (GHC)" value={formData.diagnosticFeeAmount} onChange={e => setFormData({ ...formData, diagnosticFeeAmount: e.target.value })} className="w-full border border-[#CDA032]/50 rounded-lg px-4 py-2 text-sm bg-[var(--bb-surface-2)] outline-none animate-in fade-in" />
                      )}
                    </div>

                    {/* Repair Costs Approval */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Approval for Repair Costs</h4>
                      <select value={formData.repairApproval} onChange={e => setFormData({ ...formData, repairApproval: e.target.value as any })} className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface-2)] outline-none h-12 appearance-none cursor-pointer">
                        <option value="quote">Require quote approval</option>
                        <option value="authorize">Auto-authorize limit</option>
                      </select>
                      {formData.repairApproval === 'authorize' && (
                        <input placeholder="Limit Amount (GHC)" value={formData.repairApprovalLimit} onChange={e => setFormData({ ...formData, repairApprovalLimit: e.target.value })} className="w-full border border-[#CDA032]/50 rounded-lg px-4 py-2 text-sm bg-[var(--bb-surface-2)] outline-none animate-in fade-in" />
                      )}
                    </div>

                    {/* Data Backup */}
                    <div className="space-y-3 md:col-span-2 pt-2 border-t border-[var(--bb-border)]/50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Data Backup Responsibility</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setFormData({ ...formData, dataBackup: 'acknowledges' })} className={`flex-1 p-3 text-left border rounded-xl transition-all ${formData.dataBackup === 'acknowledges' ? 'bg-[#CDA032]/10 border-[#CDA032]' : 'bg-[var(--bb-surface-2)] border-[var(--bb-border)] opacity-70 hover:opacity-100'}`}>
                          <p className={`text-xs font-bold ${formData.dataBackup === 'acknowledges' ? 'text-[#CDA032]' : ''}`}>I Acknowledge Risk</p>
                          <p className="text-[9px] mt-1">I understand there is potential data loss during repairs.</p>
                        </button>
                        <button onClick={() => setFormData({ ...formData, dataBackup: 'requests' })} className={`flex-1 p-3 text-left border rounded-xl transition-all ${formData.dataBackup === 'requests' ? 'bg-[#CDA032]/10 border-[#CDA032]' : 'bg-[var(--bb-surface-2)] border-[var(--bb-border)] opacity-70 hover:opacity-100'}`}>
                          <p className={`text-xs font-bold ${formData.dataBackup === 'requests' ? 'text-[#CDA032]' : ''}`}>Request Backup</p>
                          <p className="text-[9px] mt-1">Additional fees may apply. Subject to device state.</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- Step 4.C: Terms & Conditions --- */}
                <div className="bg-[var(--bb-surface)] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#CDA032]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-4">Terms &amp; Conditions</h3>
                  <div className="text-xs opacity-60 space-y-3 leading-relaxed mb-6 font-medium">
                    <p><strong className="text-white">Liability:</strong> BLACKBOX is not responsible for data loss, pre-existing damage, or issues unrelated to the repair.</p>
                    <p><strong className="text-white">Warranty:</strong> Repairs are covered under warranty for 7 days / 1 week unless tampered with.</p>
                    <p><strong className="text-white">Unclaimed Devices:</strong> Devices not collected within 2 weeks after completion of repairs may incur storage fees or be disposed of.</p>
                    <p><strong className="text-white">Passwords:</strong> Passwords will be treated with strict confidentiality and only authorized staff will have access.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-[var(--bb-border)] flex items-start gap-3">
                    <div onClick={() => setFormData({ ...formData, agreesToTerms: !formData.agreesToTerms })} className={`w-5 h-5 rounded flex items-center justify-center shrink-0 cursor-pointer border transition-all mt-0.5 ${formData.agreesToTerms ? 'bg-[#CDA032] border-[#CDA032]' : 'border-[var(--bb-border)] hover:border-[#CDA032]/50'}`}>
                      {formData.agreesToTerms && <Check size={14} className="text-black stroke-[3]" />}
                    </div>
                    <div className="cursor-pointer" onClick={() => setFormData({ ...formData, agreesToTerms: !formData.agreesToTerms })}>
                      <p className="text-sm font-bold">I agree to the Terms &amp; Conditions</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 pb-12">
                  <button
                    onClick={() => {
                      if (!formData.agreesToTerms) { notify('You must agree to the Terms & Conditions.', 'error'); return; }
                      // Use full name as fallback signature to avoid blocking submission.
                      if (!formData.clientSignature.trim() && formData.name.trim()) {
                        setFormData(prev => ({ ...prev, clientSignature: prev.name.trim() }));
                      }
                      submitRepairRequest();
                    }}
                    disabled={submitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest text-[#111] bg-gradient-to-r from-[#CDA032] to-[#FCE69B] hover:scale-[1.02] shadow-[0_0_30px_rgba(205,160,50,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : <><span>Confirm &amp; Request Repair</span> <Send size={18} /></>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop only) ── */}
          {step > 1 && (
            <div className="hidden lg:block w-[350px] shrink-0 sticky top-32">
              <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-6 border-b border-[var(--bb-border)] pb-4">Repair Summary</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                      {(() => {
                        const IconComp = deviceTypes.find(d => d.id === formData.deviceType)?.icon as any;
                        return IconComp ? <IconComp size={18} className="text-[#CDA032]" /> : null;
                      })()}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Device</p>
                      <p className="text-sm font-bold">{formData.brand || 'Brand'} {formData.model || ''}</p>
                    </div>
                  </div>

                  {step > 2 && selectedIssueKeys.size > 0 && (
                    <div className="flex gap-4 animate-in fade-in">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                        <AlertCircle size={18} className="text-[#CDA032]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Services</p>
                        <p className="text-sm font-bold leading-snug">
                          {Array.from(selectedIssueKeys).map(getIssueLabel).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {step > 3 && formData.date && formData.timeSlot && (
                    <div className="flex gap-4 animate-in fade-in">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bb-surface-2)] border border-[var(--bb-border)] flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-[#CDA032]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-0.5">Schedule</p>
                        <p className="text-sm font-bold">{formData.date}</p>
                        <p className="text-xs opacity-70 mt-0.5">{selectedTimeSlot?.time}</p>
                      </div>
                    </div>
                  )}

                  {usesApplePricing && step >= 2 && selectedIssueKeys.size > 0 && (
                    <div className="pt-6 border-t border-[var(--bb-border)]">
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">Estimated Total</p>
                      <p className="text-2xl font-black text-[#CDA032] tracking-tighter">{getEstimatedCost()}</p>
                      <p className="text-[9px] uppercase tracking-wider opacity-40 mt-1">* Confirmed on review step</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};