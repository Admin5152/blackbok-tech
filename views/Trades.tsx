import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  RefreshCcw, Smartphone, Tablet,
  ArrowLeft, ArrowRight, Check, Send, User, Phone, Mail, Calendar,
  Package, Info, CheckCircle2, XCircle, MapPin, Clock, ChevronRight
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { Product, TradeRequest } from '../types';
import { useAppContext } from '../App';
import { TRADE_DEVICES_KEY } from './admin/adminUtils';
import {
  isEligibleTradeUpgradeProduct,
  resolveUpgradeTargetProducts,
  TRADE_UPGRADE_PICKS_UPDATED_EVENT,
  TRADE_UPGRADE_PRODUCT_IDS_KEY,
} from '../lib/tradeUpgradePicks';
import { DEFAULT_TRADE_DEVICES, mergeTradeDevicesFromStorageArray } from '../data/tradeInDevices';
import { createTradeRequest, updateTradeRequest } from '../lib/api';
import { customerStatusBadgeClasses, customerTradeStatusShort } from '../lib/customerStatusLabels';
import { TRADE_BOOKING_TIME_SLOTS, getTradeBookingTimeSlot } from '../data/repairBooking';
import { saveResumeAfterAuth, peekRestorePayload, clearRestorePayload } from '../lib/resumeAfterAuth';
import { formatCurrency } from '../lib/utils';
import { FlowStepper } from '../components/FlowStepper';
import { PageBackButton } from '../components/PageBackButton';
import { BrandLogo } from '../components/BrandLogo';
import { tradeHasValidOffer, tradeOfferAmount } from '../lib/tradeOffer';
import { TRADE_COMPONENT_DEFS } from '../lib/tradeValuation';
import { isTradeComponentKey, type TradeComponentKey } from '../lib/tradeComponentKeys';
import {
  computeTopUpAmount,
  computeTradeValuation,
  resolveTradeModelKey,
} from '../lib/tradeValuation';
import { TRADE_PRICING_UPDATED_EVENT, lookupDeductions } from '../lib/tradePricingStore';
import { TRADE_FLOW_STEPS, formatTradeDeviceDisplayLabel, formatTradeDeviceNameForApi } from '../lib/tradeWizard';
import { TradeValuationCard } from '../components/TradeValuationCard';
import { ProductOptionPickers } from '../components/ProductOptionPickers';
import {
  defaultSelectedOptionsForProduct,
  findVariantIdForOptions,
  formatSelectedOptionsLabel,
  getAvailableStock,
  getProductOptionGroups,
  productHasAnyStock,
  sortProductsStockFirst,
} from '../lib/productOptions';
import { getStorageTiersForModel, getSimVariantsForModel } from '../lib/tradePricingStore';

interface TradesProps {
  products: Product[];
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// Apple trade-in only: iPhone & iPad
const DEVICE_TYPES = [
  { id: 'smartphone', label: 'iPhone', icon: Smartphone },
  { id: 'tablet', label: 'iPad', icon: Tablet },
] as const;

// ══════════════════════════════════════════════════════════════════════════════
export const Trades: React.FC<TradesProps> = ({ products, notify }) => {
  const { user, theme, trades: appTrades, setTrades } = useAppContext();
  const navigate = useNavigate();
  const isLight = theme === 'light';

  const [tradeDevices, setTradeDevices] = useState(DEFAULT_TRADE_DEVICES);
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
  const [tradePhase, setTradePhase] = useState<1 | 2 | 3>(1); // step 2: upgrade → condition → notes
  const [bookingPhase, setBookingPhase] = useState<1 | 2>(1); // step 3: schedule → contact
  const [transitionKey, setTransitionKey] = useState(0);

  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [selectedBrand, setSelectedBrand]           = useState('');
  const [customBrandName, setCustomBrandName]       = useState('');
  const [customModelName, setCustomModelName]       = useState('');
  const [selectedDevice, setSelectedDevice]         = useState<typeof tradeDevices[0] | null>(null);
  const [selectedVariant, setSelectedVariant]       = useState('');
  const [storageTier, setStorageTier]               = useState('');
  const [simVariant, setSimVariant]                 = useState('');
  const [targetProductId, setTargetProductId]       = useState('');
  const [targetSelectedOptions, setTargetSelectedOptions] = useState<Record<string, string>>({});
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

  const [faultyComponents, setFaultyComponents] = useState<Set<TradeComponentKey>>(new Set());

  const formRef = useRef<HTMLDivElement>(null);
  const tradesRestoreDone = useRef(false);
  const [upgradePicksRev, setUpgradePicksRev] = useState(0);
  const [tradePricingRev, setTradePricingRev] = useState(0);

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
  }, [step, subStep, tradePhase, bookingPhase]);

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
    if (typeof payload.tradePhase === 'number' && payload.tradePhase >= 1 && payload.tradePhase <= 3) {
      setTradePhase(payload.tradePhase as 1 | 2 | 3);
    }
    if (typeof payload.bookingPhase === 'number' && payload.bookingPhase >= 1 && payload.bookingPhase <= 2) {
      setBookingPhase(payload.bookingPhase as 1 | 2);
    }
    if (typeof payload.transitionKey === 'number') setTransitionKey(payload.transitionKey);
    if (typeof payload.selectedDeviceType === 'string') {
      setSelectedDeviceType(payload.selectedDeviceType);
      setSelectedBrand('Apple');
    }
    if (typeof payload.subStep === 'number') {
      const ss = payload.subStep === 2 ? 3 : payload.subStep;
      if (ss >= 1 && ss <= 3) setSubStep(ss);
    }
    if (typeof payload.selectedBrand === 'string' && payload.selectedBrand) setSelectedBrand('Apple');
    if (typeof payload.customBrandName === 'string') setCustomBrandName(payload.customBrandName);
    if (typeof payload.customModelName === 'string') setCustomModelName(payload.customModelName);
    if (needId) {
      const dev = tradeDevices.find((d) => d.id === needId);
      if (dev) setSelectedDevice(dev);
    }
    if (typeof payload.selectedVariant === 'string') setSelectedVariant(payload.selectedVariant);
    if (typeof payload.storageTier === 'string') setStorageTier(payload.storageTier);
    if (typeof payload.simVariant === 'string') setSimVariant(payload.simVariant);
    if (typeof payload.targetProductId === 'string') {
      const restoredTarget = products.find((x) => x.id === payload.targetProductId);
      if (restoredTarget && isEligibleTradeUpgradeProduct(restoredTarget)) {
        setTargetProductId(payload.targetProductId);
        if (payload.targetSelectedOptions && typeof payload.targetSelectedOptions === 'object') {
          setTargetSelectedOptions(payload.targetSelectedOptions as Record<string, string>);
        } else {
          setTargetSelectedOptions(defaultSelectedOptionsForProduct(restoredTarget));
        }
      } else {
        setTargetProductId('');
        setTargetSelectedOptions({});
      }
    }
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
    if (Array.isArray(payload.faultyComponents)) {
      setFaultyComponents(
        new Set((payload.faultyComponents as string[]).filter((k): k is TradeComponentKey => isTradeComponentKey(k))),
      );
    }
    notify('Your trade-in progress was restored.', 'success');
  }, [user, tradeDevices, products, notify]);

  useEffect(() => {
    if (!targetProductId) return;
    const p = products.find((x) => x.id === targetProductId);
    if (p && !isEligibleTradeUpgradeProduct(p)) {
      setTargetProductId('');
      setTargetSelectedOptions({});
    }
  }, [products, targetProductId]);

  // Devices filtered by type + brand
  const devicesForBrand = useMemo(() =>
    tradeDevices.filter(d => d.deviceType === selectedDeviceType && d.brand === selectedBrand),
    [tradeDevices, selectedDeviceType, selectedBrand],
  );

  const isCatalogOtherBrand = selectedBrand === 'Other';
  const resolvedBrand =
    isCatalogOtherBrand && customBrandName.trim() ? customBrandName.trim() : selectedBrand;

  const usesFreeTextModel = useMemo(() => {
    if (!selectedBrand) return false;
    if (isCatalogOtherBrand) return true;
    if (devicesForBrand.length === 0) return true;
    if (devicesForBrand.length === 1 && /other/i.test(devicesForBrand[0].name)) return true;
    return false;
  }, [selectedBrand, isCatalogOtherBrand, devicesForBrand]);

  const variantNeedsCustomName = Boolean(
    selectedVariant && /^other(\s|$)/i.test(selectedVariant.trim()),
  );

  useEffect(() => {
    if (subStep !== 3 || usesFreeTextModel || selectedDevice) return;
    if (devicesForBrand.length === 1) {
      setSelectedDevice(devicesForBrand[0]);
    }
  }, [subStep, usesFreeTextModel, devicesForBrand, selectedDevice]);

  const deviceLabelInput = useMemo(
    () => ({
      usesFreeTextModel,
      customModelName,
      resolvedBrand,
      selectedBrand,
      selectedDevice,
      selectedVariant,
      variantNeedsCustomName,
    }),
    [
      usesFreeTextModel,
      customModelName,
      resolvedBrand,
      selectedBrand,
      selectedDevice,
      selectedVariant,
      variantNeedsCustomName,
    ],
  );

  const tradeInDeviceLabel = useMemo(
    () => formatTradeDeviceDisplayLabel(deviceLabelInput),
    [deviceLabelInput],
  );

  const clearDeviceLinePicks = () => {
    setSelectedDevice(null);
    setSelectedVariant('');
    setCustomModelName('');
  };

  const clearBrandAndBelow = () => {
    setSelectedBrand('');
    setCustomBrandName('');
    clearDeviceLinePicks();
  };

  useEffect(() => {
    const bump = () => setTradePricingRev((v) => v + 1);
    window.addEventListener(TRADE_PRICING_UPDATED_EVENT, bump);
    return () => window.removeEventListener(TRADE_PRICING_UPDATED_EVENT, bump);
  }, []);

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
    () => sortProductsStockFirst(resolveUpgradeTargetProducts(products)),
    [products, upgradePicksRev],
  );

  const targetProduct = useMemo(() =>
    products.find(p => p.id === targetProductId),
    [products, targetProductId],
  );

  const targetOptionGroups = useMemo(
    () => (targetProduct ? getProductOptionGroups(targetProduct) : []),
    [targetProduct],
  );

  const targetOptionsLabel = useMemo(
    () => formatSelectedOptionsLabel(targetSelectedOptions),
    [targetSelectedOptions],
  );

  const tradeModelKey = useMemo(
    () =>
      resolveTradeModelKey({
        selectedVariant,
        customModelName,
        usesFreeTextModel,
      }),
    [selectedVariant, customModelName, usesFreeTextModel],
  );

  const availableStorageTiers = useMemo(() => getStorageTiersForModel(tradeModelKey), [tradeModelKey]);
  const availableSimVariants = useMemo(() => getSimVariantsForModel(tradeModelKey), [tradeModelKey]);

  useEffect(() => {
    setStorageTier('');
    setSimVariant('');
  }, [tradeModelKey]);

  const tradeValuation = useMemo(
    () => computeTradeValuation(tradeModelKey, storageTier, simVariant, faultyComponents),
    [tradeModelKey, storageTier, simVariant, faultyComponents],
  );

  const modelDeductions = useMemo(() => lookupDeductions(tradeModelKey), [tradeModelKey]);

  const targetProductPrice = targetProduct?.price ?? 0;
  const topUpAmount = useMemo(
    () =>
      tradeValuation.hasKnownBasePrice && targetProductPrice > 0
        ? computeTopUpAmount(targetProductPrice, tradeValuation.finalTradeValue)
        : 0,
    [tradeValuation, targetProductPrice],
  );

  const toggleFaultyComponent = (key: TradeComponentKey) => {
    setFaultyComponents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectTargetProduct = (id: string) => {
    if (!id) {
      setTargetProductId('');
      setTargetSelectedOptions({});
      return;
    }
    const p = products.find((x) => x.id === id);
    if (p && !productHasAnyStock(p)) {
      notify('This product is out of stock and cannot be selected.', 'error');
      return;
    }
    setTargetProductId(id);
    setTargetSelectedOptions(p ? defaultSelectedOptionsForProduct(p) : {});
  };

  const pendingOffer = appTrades.find(
    (t) =>
      (t.status === 'Awaiting User' || t.status === 'Offer sent' || t.status === 'Offer Made') &&
      tradeHasValidOffer(t),
  );

  const selectedTimeSlot = getTradeBookingTimeSlot(formData.timeSlot);

  const go = (n: number) => {
    setTransitionKey(k => k + 1);
    setStep(n);
    setSubStep(1);
    if (n === 2) setTradePhase(1);
    if (n === 3) setBookingPhase(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const advanceTradePhase = (next: 2 | 3) => {
    setTradePhase(next);
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const advanceBookingPhase = (next: 2) => {
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
    if (formData.fulfillmentMethod === 'Pickup' && !formData.address?.trim()) {
      notify('Please enter your address for pickup service.', 'error');
      return false;
    }
    return true;
  };

  /** Step 1 wizard: Back drops downstream picks; Change only reopens that slice (keeps other choices / later steps). */
  const undoToDeviceTypeStep = () => {
    clearBrandAndBelow();
    setSubStep(1);
    setTransitionKey((k) => k + 1);
  };

  /** Back from model step — keep type + brand, clear device line + variant. */
  const backFromModelStep = () => {
    clearDeviceLinePicks();
    setSubStep(1);
    setTransitionKey((k) => k + 1);
  };

  /** Same category + brand; clear only device line + variant (re-pick model). */
  const reopenModelPickerKeepTypeAndBrand = () => {
    clearDeviceLinePicks();
    setSubStep(3);
    setTransitionKey((k) => k + 1);
  };

  /** Change on device-type summary — model step: new device/variant only. Brand step: new category only (keeps type). Else: full category re-pick from type grid. */
  const changeDeviceTypeSection = () => {
    if (subStep === 3 && selectedDeviceType && selectedBrand) {
      reopenModelPickerKeepTypeAndBrand();
      return;
    }
    clearBrandAndBelow();
    setSubStep(1);
    setTransitionKey((k) => k + 1);
  };

  /** From step 2+ — edit device: keep brand & category when possible; only clear model picks. */
  const reopenDeviceWizardFromLaterStep = () => {
    setStep(1);
    if (selectedDeviceType && selectedBrand) {
      clearDeviceLinePicks();
      setSubStep(3);
    } else if (selectedDeviceType) {
      clearBrandAndBelow();
      setSubStep(2);
    } else {
      setSelectedDeviceType('');
      clearBrandAndBelow();
      setSubStep(1);
    }
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openStep = (n: number) => {
    setStep(n);
    if (n === 2) setTradePhase(1);
    if (n === 3) setBookingPhase(1);
    setTransitionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitRequest = async () => {
    if (!user) {
      saveResumeAfterAuth('trades', {
        step,
        subStep,
        tradePhase,
        bookingPhase,
        transitionKey,
        selectedDeviceType,
        selectedBrand,
        customBrandName,
        customModelName,
        selectedDeviceId: selectedDevice?.id ?? null,
        selectedVariant,
        storageTier,
        simVariant,
        targetProductId,
        targetSelectedOptions,
        notes,
        formData,
        deviceDetails,
        accessories,
        faultyComponents: Array.from(faultyComponents),
      });
      notify('Sign in to submit. Your progress will be restored after you log in.', 'info');
      navigate({ to: '/auth' });
      return;
    }
    if (usesFreeTextModel) {
      if (isCatalogOtherBrand && !customBrandName.trim()) {
        notify('Please enter the device brand name.', 'error');
        return;
      }
      if (!customModelName.trim()) {
        notify('Please enter your device model name.', 'error');
        return;
      }
    } else if (!selectedDevice || !selectedVariant) {
      notify('Please select your device and model', 'error');
      return;
    } else if (variantNeedsCustomName && !customModelName.trim()) {
      notify('Please type your specific model name.', 'error');
      return;
    }
    if (!deviceDetails.serialNumber?.trim()) { notify('Please enter the Serial / IMEI number', 'error'); return; }
    if (!formData.name || !formData.email || !formData.phone) { notify('Please fill in all contact details', 'error'); return; }
    if (targetProduct) {
      if (!isEligibleTradeUpgradeProduct(targetProduct)) {
        notify('Trade-in upgrades are limited to iPhone and iPad products only.', 'error');
        return;
      }
      if (!productHasAnyStock(targetProduct)) {
        notify('Your selected upgrade product is out of stock. Pick another or choose “Not sure yet”.', 'error');
        return;
      }
      if (targetOptionGroups.length > 0 && getAvailableStock(targetProduct, targetSelectedOptions) <= 0) {
        notify('That color/storage/RAM combination is out of stock. Pick another configuration.', 'error');
        return;
      }
    }
    setSubmitting(true);
    try {
      const accessoriesList = Object.entries(accessories).filter(([,v]) => v).map(([k]) => k);
      const componentSummary = tradeValuation.deductions.length
        ? `\nComponent deductions:\n${tradeValuation.deductions.map((d) => `- ${d.label}: -${d.amount}`).join('\n')}`
        : '';
      const valuationSummary = tradeValuation.hasKnownBasePrice
        ? `\n[Estimate]\nBase purchase: ${tradeValuation.basePurchasePrice}\nDeductions: ${tradeValuation.totalDeductionAmount}\nFinal credit: ${tradeValuation.finalTradeValue}${targetProduct ? `\nTop-up: ${topUpAmount}` : ''}`
        : '\n[Estimate] Quote after inspection';
      const detailsText = `${notes ? notes + '\n\n' : ''}Serial/IMEI: ${deviceDetails.serialNumber || 'N/A'}\nPhysical: ${deviceDetails.physicalDesc || 'N/A'}${componentSummary}${valuationSummary}\nWhen Started: ${deviceDetails.whenStarted || 'N/A'}\nPrevious Repairs: ${deviceDetails.previousRepairs || 'N/A'}\nAccessories: ${accessoriesList.length ? accessoriesList.join(', ') : 'None'}`;
      const data = await createTradeRequest({
        user_id: user.id,
        user_name: formData.name,
        user_email: formData.email,
        device_brand: resolvedBrand,
        device_type: selectedDeviceType as 'smartphone' | 'tablet',
        pricing_mode: tradeValuation.pricingMode,
        storage_tier: storageTier || undefined,
        sim_variant: simVariant || undefined,
        base_trade_value: tradeValuation.hasKnownBasePrice ? tradeValuation.basePurchasePrice : undefined,
        deduction_breakdown: tradeValuation.deductions,
        component_flags: Array.from(faultyComponents),
        estimated_value: tradeValuation.hasKnownBasePrice ? tradeValuation.finalTradeValue : undefined,
        target_product_price: targetProduct ? targetProductPrice : undefined,
        top_up_amount:
          targetProduct && tradeValuation.hasKnownBasePrice ? topUpAmount : undefined,
        device_name: formatTradeDeviceNameForApi(deviceLabelInput),
        user_description: detailsText,
        accessories: accessoriesList,
        target_device: targetProduct
          ? [targetProduct.name, targetOptionsLabel].filter(Boolean).join(' — ')
          : '',
        target_product_id: targetProduct?.id || undefined,
        target_variant_id: targetProduct
          ? findVariantIdForOptions(targetProduct, targetSelectedOptions) || undefined
          : undefined,
        preferred_date: formData.date || undefined,
        preferred_time: selectedTimeSlot?.time || '',
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
        device: formatTradeDeviceDisplayLabel(deviceLabelInput),
        status: 'Pending',
        date: new Date().toISOString(),
        estimatedValue: tradeValuation.hasKnownBasePrice ? tradeValuation.finalTradeValue : 0,
      } as TradeRequest;
      setLastSubmittedTrade(newTrade);
      setTrades([newTrade, ...appTrades]);
      notify("Trade-in request submitted! A final estimation will be carried out by the Black Box team and you will be notified soon.", 'success');
      go(5);
    } catch (err: any) {
      notify('Submission failed: ' + (err.message || 'Please try again'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferResponse = async (tradeId: string, accept: boolean) => {
    const row = appTrades.find((t) => t.id === tradeId);
    if (accept && row && !tradeHasValidOffer(row)) {
      notify('This offer is not ready yet — staff must set an offer value first.', 'error');
      return;
    }
    try {
      await updateTradeRequest(tradeId, { status: accept ? 'Accepted' : 'Rejected' });
      setTrades(appTrades.map(t => t.id === tradeId ? { ...t, status: accept ? 'Accepted' : 'Rejected' } : t));
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
          <div className="mb-6">
            <PageBackButton isLight={theme === 'light'} fallbackTo="/" />
          </div>
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
          <p className="mt-4 text-sm text-[color:var(--bb-muted)] max-w-xl leading-relaxed">
            Apple iPhone &amp; iPad only. Pick your device, flag any faulty parts for an instant estimate, optionally choose a new iPhone or iPad to upgrade to, then book your visit.
          </p>
        </header>

        {step >= 1 && step <= 4 && (
          <FlowStepper steps={TRADE_FLOW_STEPS} currentStep={step} className="mb-10" />
        )}

        {/* Pending offer banner */}
        {pendingOffer && (
          <div className="mb-8 bg-gradient-to-r from-purple-500/10 to-[#B38B21]/10 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">🎉 You Have a Trade-In Offer!</p>
                <p className="text-[color:var(--bb-text)] font-black text-lg">{pendingOffer.device}</p>
                {pendingOffer.condition && <p className="text-xs text-[color:var(--bb-muted)] mt-0.5">Condition: <span className="text-[color:var(--bb-text)] font-bold">{pendingOffer.condition}</span></p>}
                {tradeOfferAmount(pendingOffer) != null && (
                  <p className="text-2xl font-black text-[#B38B21] mt-2">
                    {formatCurrency(tradeOfferAmount(pendingOffer)!)}{' '}
                    <span className="text-xs text-[color:var(--bb-muted)] font-normal">trade-in value</span>
                  </p>
                )}
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
                  <h3 className="text-xl font-black text-[color:var(--bb-text)]">{tradeInDeviceLabel}</h3>
                </div>
                <button onClick={reopenDeviceWizardFromLaterStep} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                  Change
                </button>
              </div>
            ) : step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 active-form-section">

                {/* ── subStep 1a: Device Type ── */}
                {subStep > 1 ? (
                  <div className="flex justify-between items-center py-5 border-b border-[var(--bb-border)] animate-in fade-in">
                    <h3 className="text-lg font-bold">{DEVICE_TYPES.find(d => d.id === selectedDeviceType)?.label}</h3>
                    <button
                      type="button"
                      onClick={changeDeviceTypeSection}
                      className="text-sm font-bold text-blue-500 hover:text-blue-400"
                      title={subStep === 3 ? 'Pick a different device category' : 'Change category (keeps your current type selected until you pick again)'}
                    >
                      {subStep === 3 ? 'Change category' : 'Change'}
                    </button>
                  </div>
                ) : subStep === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">What are you trading in?</h2>
                    <p className="opacity-60 text-sm">BlackBox trade-ins are limited to Apple iPhone and iPad devices.</p>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg">
                      {DEVICE_TYPES.map(type => (
                        <button key={type.id}
                          onClick={() => {
                            setSelectedDeviceType(type.id);
                            setSelectedBrand('Apple');
                            clearDeviceLinePicks();
                            setSubStep(3);
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

                {/* ── subStep 1c: Model (Apple iPhone / iPad only) ── */}
                {subStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
                          {DEVICE_TYPES.find(d => d.id === selectedDeviceType)?.label} · {resolvedBrand}
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">
                          {usesFreeTextModel ? 'Enter your device model' : 'Select your device & model'}
                        </h2>
                      </div>
                      <button type="button" onClick={backFromModelStep} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--bb-muted)] hover:text-[#CDA032] transition-colors">
                        <ArrowLeft size={14} /> Back
                      </button>
                    </div>

                    {usesFreeTextModel ? (
                      <div className="space-y-6 max-w-xl">
                        <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-8 shadow-xl space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
                            Model name
                          </label>
                          <input
                            type="text"
                            value={customModelName}
                            onChange={(e) => setCustomModelName(e.target.value)}
                            placeholder={`Type your ${resolvedBrand} model...`}
                            className="w-full border border-[var(--bb-border)] rounded-2xl px-6 py-4 text-base font-bold bg-[var(--bb-surface-2)] outline-none focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032]/30"
                            autoFocus
                          />
                          <p className="text-[10px] text-[color:var(--bb-muted)] leading-relaxed">
                            Enter the full model name (for example iPhone 15 Pro or iPad Air M2).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!customModelName.trim()) {
                              notify('Please enter your device model name.', 'error');
                              return;
                            }
                            go(2);
                          }}
                          className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] w-full"
                        >
                          Continue <ArrowRight size={16} />
                        </button>
                      </div>
                    ) : (
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-52 shrink-0">
                        <div className={`sticky top-28 rounded-3xl border p-5 flex flex-col items-center gap-3 transition-all duration-500 ${selectedVariant || variantNeedsCustomName
                          ? 'border-[#CDA032]/50 bg-[#CDA032]/5 shadow-[0_0_50px_rgba(205,160,50,0.15)]'
                          : 'border-[var(--bb-border)] bg-[var(--bb-surface)]'}`}>
                          <div className={`transition-all duration-500 ${selectedVariant || variantNeedsCustomName ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`} style={{ height: 160 }}>
                            {selectedDevice?.img ? (
                              <img
                                src={selectedDevice.img}
                                alt={selectedDevice.name || 'Device'}
                                className="h-full w-auto object-contain drop-shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
                              />
                            ) : (
                              <BrandLogo
                                brand={selectedBrand}
                                className="h-28 w-full max-w-[10rem] text-[color:var(--bb-text)]"
                              />
                            )}
                          </div>
                          <div className="text-center">
                            {selectedVariant ? (
                              <>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#CDA032]/60 mb-0.5">Selected</p>
                                <p className="text-sm font-black text-[#CDA032] leading-tight">
                                  {variantNeedsCustomName && customModelName.trim() ? customModelName.trim() : selectedVariant}
                                </p>
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
                                  onClick={() => { setSelectedDevice(dev); setSelectedVariant(''); setCustomModelName(''); }}
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

                        {/* Variant chips — shown once a device is selected */}
                        {selectedDevice && (
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]/70 mb-3">Select Model</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1"
                              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(205,160,50,0.3) transparent' }}>
                              {selectedDevice.variants.map(v => (
                                <button key={v} onClick={() => { setSelectedVariant(v); if (!/^other(\s|$)/i.test(v.trim())) setCustomModelName(''); }}
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

                        {variantNeedsCustomName && (
                          <div className="rounded-2xl border border-[#CDA032]/40 bg-[#CDA032]/5 p-5 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] block">
                              Your model name
                            </label>
                            <input
                              type="text"
                              value={customModelName}
                              onChange={(e) => setCustomModelName(e.target.value)}
                              placeholder="Type the exact model name"
                              className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm font-semibold bg-[var(--bb-surface)] outline-none focus:border-[#CDA032] focus:ring-1 focus:ring-[#CDA032]/30"
                              autoFocus
                            />
                          </div>
                        )}

                        {selectedVariant && availableStorageTiers.length > 0 && (
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]/70 mb-3">Storage Capacity</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {availableStorageTiers.map(tier => (
                                <button key={tier} onClick={() => setStorageTier(tier)}
                                  className={`py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${storageTier === tier
                                    ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] ring-1 ring-[#CDA032]'
                                    : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40 opacity-70 hover:opacity-100'}`}>
                                  {tier}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedVariant && availableSimVariants.length > 0 && availableSimVariants.some(v => v && v !== 'Any' && v !== 'null') && (
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]/70 mb-3">SIM Type</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {availableSimVariants.filter(v => v && v !== 'Any' && v !== 'null').map(sim => (
                                <button key={sim} onClick={() => setSimVariant(sim)}
                                  className={`py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${simVariant === sim
                                    ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] ring-1 ring-[#CDA032]'
                                    : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40 opacity-70 hover:opacity-100'}`}>
                                  {sim === 'Physical' ? 'Physical SIM' : sim === 'eSIM' ? 'eSIM Only' : sim}
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
                              if (variantNeedsCustomName && !customModelName.trim()) {
                                notify('Please type your specific model name.', 'error');
                                return;
                              }
                              if (!usesFreeTextModel && !variantNeedsCustomName) {
                                if (availableStorageTiers.length > 0 && !storageTier) {
                                  notify('Please select a storage capacity.', 'error');
                                  return;
                                }
                                if (availableSimVariants.length > 0 && availableSimVariants.some(v => v && v !== 'Any' && v !== 'null') && !simVariant) {
                                  notify('Please select a SIM type.', 'error');
                                  return;
                                }
                              }
                              go(2);
                            }}
                            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] active:scale-[0.98] transition-all w-full"
                          >
                            Continue <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    )}
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
                  <h3 className="text-xl font-black text-[color:var(--bb-text)]">
                    {targetProduct
                      ? `Upgrading to ${targetProduct.name}${targetOptionsLabel ? ` (${targetOptionsLabel})` : ''}`
                      : 'Details recorded'}
                  </h3>
                </div>
                <button type="button" onClick={() => openStep(2)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">Change</button>
              </div>
            ) : step === 2 && (
              <div key={`step-2-${transitionKey}-${tradePhase}`} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 active-form-section">

                <nav aria-label="Trade-in detail steps" className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {([
                    { n: 1 as const, label: 'Upgrade' },
                    { n: 2 as const, label: 'Condition' },
                    { n: 3 as const, label: 'Notes' },
                  ]).map(({ n, label }, i) => (
                    <React.Fragment key={n}>
                      {i > 0 && <ChevronRight size={14} className="opacity-30 shrink-0" aria-hidden />}
                      <button
                        type="button"
                        disabled={n > tradePhase}
                        onClick={() => {
                          if (n >= tradePhase) return;
                          setTradePhase(n);
                          setTransitionKey((k) => k + 1);
                        }}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                          tradePhase === n
                            ? 'bg-[#CDA032] text-black'
                            : tradePhase > n
                              ? 'bg-[var(--bb-surface-2)] border border-[var(--bb-border)] opacity-80 hover:border-[#CDA032]/40'
                              : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {label}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>

                {tradePhase === 1 && (
                  <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">What are you upgrading to?</h2>
                  <p className="opacity-60 text-sm">Optional — iPhone and iPad store products only.</p>
                </div>

                <div>
                  <p className="text-xs text-[color:var(--bb-muted)] mb-4">Pick a product you have in mind, or skip if you are not sure yet.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[min(52vh,28rem)] overflow-y-auto pr-0.5">
                    <button type="button" onClick={() => selectTargetProduct('')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${!targetProductId
                        ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-60 hover:opacity-100'}`}>
                      Not sure yet
                    </button>
                    {upgradeProducts.map(p => {
                      const inStock = productHasAnyStock(p);
                      return (
                      <button
                        type="button"
                        key={p.id}
                        disabled={!inStock}
                        onClick={() => selectTargetProduct(p.id)}
                        className={`flex flex-col items-center py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          !inStock
                            ? 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-35 cursor-not-allowed'
                            : targetProductId === p.id
                              ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
                              : 'border-[var(--bb-border)] bg-[var(--bb-surface)] opacity-60 hover:opacity-100'
                        }`}>
                        {p.image && <img src={p.image} alt={p.name} className="h-8 w-auto object-contain mb-1.5" />}
                        <span className="text-[10px] leading-tight">{p.name}</span>
                        {inStock ? (
                          <span className="text-[#CDA032] font-black mt-0.5">{formatCurrency(p.price)}</span>
                        ) : (
                          <span className="text-[10px] text-red-400/80 font-bold mt-0.5 uppercase tracking-wide">Out of stock</span>
                        )}
                      </button>
                    );})}
                  </div>
                </div>

                {targetProduct && targetOptionGroups.length > 0 && (
                  <div className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] p-5 space-y-3">
                    <p className="text-xs font-bold text-[color:var(--bb-text)]">
                      Choose configuration for <span className="text-[#CDA032]">{targetProduct.name}</span>
                    </p>
                    <ProductOptionPickers
                      product={targetProduct}
                      groups={targetOptionGroups}
                      selectedOptions={targetSelectedOptions}
                      onChange={setTargetSelectedOptions}
                      strictStock
                      showStockHints
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => advanceTradePhase(2)}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next: Device condition <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}

                {tradePhase === 2 && (
                  <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Device condition</h2>
                  <p className="opacity-60 text-sm">
                    Flag any faulty components — we deduct a percentage of our purchase price for each issue.
                  </p>
                </div>

                {!usesFreeTextModel && availableSimVariants.length > 0 && availableSimVariants.some(v => v && v !== 'Any' && v !== 'null') && (
                  <div className="space-y-3 p-5 rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                    <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]">SIM Type</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableSimVariants.filter(v => v && v !== 'Any' && v !== 'null').map(sim => (
                        <button key={sim} onClick={() => setSimVariant(sim)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold text-center transition-all ${simVariant === sim
                            ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] ring-1 ring-[#CDA032]'
                            : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40 opacity-70 hover:opacity-100'}`}>
                          {sim === 'Physical' ? 'Physical SIM' : sim === 'eSIM' ? 'eSIM Only' : sim}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 p-5 rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                  <p className="text-xs font-black uppercase tracking-widest text-[#CDA032]">Component checklist</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TRADE_COMPONENT_DEFS.map((comp) => {
                      const selected = faultyComponents.has(comp.key);
                      const deductionAmount = modelDeductions.get(comp.key) || 0;
                      return (
                        <button
                          key={comp.key}
                          type="button"
                          onClick={() => toggleFaultyComponent(comp.key)}
                          className={`flex flex-col items-start text-left p-3 rounded-xl border transition-all ${
                            selected
                              ? 'border-[#CDA032] bg-[#CDA032]/10'
                              : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/30'
                          }`}
                        >
                          <div className="flex w-full items-start justify-between gap-2 mb-1">
                            <span className={`text-xs font-bold ${selected ? 'text-[#CDA032]' : ''}`}>{comp.label}</span>
                            {deductionAmount > 0 && (
                              <span className="text-[10px] font-black text-[#CDA032] shrink-0">−{formatCurrency(deductionAmount)}</span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-60 leading-snug">{comp.description}</span>
                        </button>
                      );
                    })}
                  </div>

                  <TradeValuationCard
                    valuation={tradeValuation}
                    targetPrice={targetProductPrice > 0 ? targetProductPrice : undefined}
                    topUp={topUpAmount}
                  />

                  <input type="text" placeholder="Serial / IMEI *"
                    value={deviceDetails.serialNumber}
                    onChange={e => setDeviceDetails({ ...deviceDetails, serialNumber: e.target.value })}
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50" />

                  <textarea rows={2} placeholder="Anything else about cosmetic condition? "
                    value={deviceDetails.physicalDesc}
                    onChange={e => setDeviceDetails({ ...deviceDetails, physicalDesc: e.target.value })}
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none resize-none" />

                  <div className="pt-2">
                    <p className="text-xs opacity-60 font-medium mb-3">Accessories included</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries({ chargers: 'Charger', caseCover: 'Case / Cover', cables: 'Cables', memory: 'Memory Card', other: 'Other' }) as [keyof typeof accessories, string][]).map(([k, label]) => (
                        <button key={k}
                          type="button"
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

                <div className="flex flex-wrap gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setTradePhase(1);
                      setTransitionKey((k) => k + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-[var(--bb-border)] hover:border-[#CDA032]/40 transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceTradePhase(3)}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Next: Notes <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}

                {tradePhase === 3 && (
                  <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Anything else?</h2>
                  <p className="opacity-60 text-sm">Optional notes before you book your drop-off or pickup.</p>
                </div>

                <TradeValuationCard
                  valuation={tradeValuation}
                  targetPrice={targetProductPrice > 0 ? targetProductPrice : undefined}
                  topUp={topUpAmount}
                />

                <div className="space-y-4">
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Anything else we should know about the device..."
                    className="w-full border border-[var(--bb-border)] rounded-2xl px-5 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 resize-none leading-relaxed" />
                </div>

                <div className="flex flex-wrap gap-3 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setTradePhase(2);
                      setTransitionKey((k) => k + 1);
                    }}
                    className="flex items-center gap-2 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-[var(--bb-border)] hover:border-[#CDA032]/40 transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => go(3)}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Continue to booking <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}
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
                    {formData.date} at {selectedTimeSlot?.time}
                  </h3>
                </div>
                <button type="button" onClick={() => openStep(3)} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">Change</button>
              </div>
            ) : step === 3 && (
              <div key={`step-3-${transitionKey}-${bookingPhase}`} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 active-form-section">

                <nav aria-label="Booking steps" className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {([
                    { n: 1 as const, label: 'Schedule' },
                    { n: 2 as const, label: 'Your details' },
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
                    <p className="opacity-60 text-sm">Choose how you&apos;d like to get your device to us.</p>
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
                          style={{ colorScheme: isLight ? 'light' : 'dark' }} />
                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CDA032] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Time Slot</h3>
                      <div className="relative">
                        <select value={formData.timeSlot} onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                          className="w-full border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm bg-[var(--bb-surface)] outline-none focus:border-[#CDA032]/50 appearance-none cursor-pointer h-[54px]">
                          <option value="">Select an available time...</option>
                          {TRADE_BOOKING_TIME_SLOTS.map(t => (
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
                    <p className="opacity-60 text-sm">We&apos;ll use this to send you your offer and keep you updated.</p>
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

                <div className="flex flex-wrap gap-3 pt-8">
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
                      if (!validateBookingSchedule()) {
                        setBookingPhase(1);
                        return;
                      }
                      if (!validateBookingContact()) return;
                      go(4);
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Review request <ArrowRight size={16} />
                  </button>
                </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 4 — Review & Submit
                (mirrors Repair's Step 4)
            ══════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 active-form-section">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">Review your trade-in</h2>
                  <p className="opacity-60 text-sm">Your estimate is below — final credit is confirmed after we inspect the device.</p>
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
                        <h3 className="text-2xl font-black">{tradeInDeviceLabel}</h3>
                        {targetProduct && (
                          <p className="text-sm text-[color:var(--bb-muted)] mt-1">
                            Upgrading to:{' '}
                            <span className="text-[color:var(--bb-text)] font-bold">
                              {targetProduct.name}
                              {targetOptionsLabel ? ` — ${targetOptionsLabel}` : ''}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-4">
                    <TradeValuationCard
                      valuation={tradeValuation}
                      targetPrice={targetProductPrice > 0 ? targetProductPrice : undefined}
                      topUp={topUpAmount}
                    />

                    <div className="flex gap-3 items-start p-4 bg-[#CDA032]/10 rounded-xl">
                      <Info size={16} className="text-[#CDA032] shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed text-[#CDA032] font-semibold">
                        Final credit may change after physical inspection. You approve every offer before we proceed.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[var(--bb-border)]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Appointment</p>
                        <p className="text-sm font-semibold">{formData.date}</p>
                        <p className="text-sm opacity-80">{selectedTimeSlot?.time} · {formData.fulfillmentMethod}</p>
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
                    Our team will review your {tradeInDeviceLabel} and send a personalised offer to{' '}
                    <span className="text-[color:var(--bb-text)] font-bold">{formData.email}</span>.
                  </p>
                </div>
                <div className="bg-[var(--bb-surface)] border border-[var(--bb-border)] rounded-2xl p-4 text-left max-w-xs mx-auto space-y-2 text-xs text-[color:var(--bb-muted)]">
                  <p className="font-black text-[color:var(--bb-text)] text-sm mb-2">What happens next?</p>
                  {['We verify your device on arrival','Component checklist is confirmed in person','You receive a final offer within 24h','Accept or decline — upgrade to iPhone/iPad only'].map((s, i) => (
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
                      <p className="text-sm font-bold">{tradeInDeviceLabel}</p>
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
                        {targetOptionsLabel && (
                          <p className="text-[10px] text-[color:var(--bb-muted)] mt-0.5">{targetOptionsLabel}</p>
                        )}
                        <p className="text-xs text-[#CDA032] font-black">{formatCurrency(targetProduct.price)}</p>
                      </div>
                    </div>
                  )}

                  {step >= 2 && tradeValuation.hasKnownBasePrice && (
                    <div className="pt-6 border-t border-[var(--bb-border)] animate-in fade-in">
                      <TradeValuationCard
                        valuation={tradeValuation}
                        targetPrice={step > 2 && targetProductPrice > 0 ? targetProductPrice : undefined}
                        topUp={step > 2 && targetProductPrice > 0 ? topUpAmount : undefined}
                        compact
                      />
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
                        <p className="text-xs opacity-70 mt-0.5">{selectedTimeSlot?.time}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Past trades */}
              {user && appTrades.length > 0 && (
                <div className="mt-4 rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-xl">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-4 border-b border-[var(--bb-border)] pb-4">My Requests</h3>
                  <div className="space-y-3">
                      {appTrades.slice(0, 5).map(t => (
                        <div key={t.id} className="border border-[var(--bb-border)] rounded-xl p-3">
                          {t.display_id && (
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#CDA032] mb-1">
                              {t.display_id}
                            </p>
                          )}
                          <p className="text-xs font-black text-[color:var(--bb-text)] truncate">{(t as any).device}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full max-w-[140px] truncate ${customerStatusBadgeClasses(t.status, 'trade', isLight)}`}
                              title={customerTradeStatusShort(String(t.status))}
                            >
                              {customerTradeStatusShort(String(t.status))}
                            </span>
                            {(t as any).finalValue && <span className="text-[10px] font-black text-[#CDA032]">{formatCurrency(Number((t as any).finalValue))}</span>}
                          </div>
                          {(t.status === 'Awaiting User' || t.status === 'Offer sent' || t.status === 'Offer Made') &&
                            tradeHasValidOffer(t) && (
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};