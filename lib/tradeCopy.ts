/**
 * Trade-in customer-facing copy — single source for all UI strings.
 *
 * Role in flow: Screens 1–9 of the trade-in wizard (device pick → config →
 * target → questionnaire → summary → details → confirmation). Admin-editable
 * content (questions, threshold message, validity days) lives in DB tables;
 * this module holds static labels, help text, and placeholders only.
 *
 * Never hardcode trade copy in components — import from here.
 */

/** Screen 1 — device type cards */
export const TRADE_COPY = {
  /** Page chrome — matches Repair hero / summary language */
  layout: {
    eyebrow: 'BlackBox Trade-In Center',
    heroLine1: 'Trade in. Upgrade',
    heroLine2: 'without the hassle.',
    heroSub:
      'Apple iPhone & iPad. Pick your device, answer a short condition check, then bring it to BlackBox.',
    summaryTitle: 'Trade-in Summary',
    summaryDevice: 'Device',
    summarySpecs: 'Specs',
    summaryTarget: 'Trading into',
    summaryEstimate: 'Estimated value',
    summaryEstimateNote: '* Confirmed after inspection',
    summaryPending: 'Estimate appears after condition check',
    selectModelHint: 'Select a model →',
    selected: 'Selected',
  },

  deviceType: {
    iphone: 'iPhone',
    ipad: 'iPad',
    heading: 'What are you trading in?',
    subheading: 'Select your device type to get started.',
  },

  /** Screen 2 — series / line grid */
  category: {
    heading: 'Which series is your device?',
    notListed: 'My device isn\'t listed',
    notListedHint: 'Tap for details',
    notListedTitle: 'Only listed devices can be traded online',
    notListedBody:
      'The devices shown are the only models currently accepted for online trade-in. If yours isn\'t listed, we can\'t start an estimate here — please visit BlackBox in person for help.',
    notListedClose: 'Got it',
  },

  /** Screen 3 — model selection */
  model: {
    heading: 'Select your model',
  },

  /** Screen 4 — your device specs */
  config: {
    heading: 'Your device specifications',
    storage: 'Storage',
    simType: 'SIM type',
    simPhysical: 'Physical SIM',
    simEsim: 'eSIM only',
    simWifi: 'Wi-Fi only',
    color: 'Color',
    generation: 'Generation (chip)',
    size: 'Screen size',
    imei: 'IMEI or serial number',
    imeiHelp: 'Dial *#06# or go to Settings → General → About.',
    imeiInfoTitle: 'How to find your IMEI / serial',
    imeiInfoBody:
      'On iPhone or iPad: dial *#06# or open Settings → General → About. Use the IMEI (15 digits) when shown, or the serial number. We use this to confirm the device matches your request.',
    imeiInvalid: 'Enter a valid 15-digit IMEI (Luhn check) or a serial of at least 8 letters/numbers.',
    helpText:
      'Not sure of your storage or SIM type? Check Settings → General → About.',
    colorNote: 'Color is for identification only — it does not affect your trade-in value.',
  },

  /** Screen 5 — target device */
  target: {
    heading: 'What are you upgrading to?',
    subheading: 'Optional — helps us tailor your trade-in offer.',
    pickHint: 'Pick a product you have in mind, or skip if you are not sure yet.',
    browseByCategory: 'Shop by category',
    pickModel: 'Select a model',
    configureSku: 'Configure your upgrade',
    storage: 'Storage',
    simType: 'SIM type',
    color: 'Color',
    price: 'Price',
    cashOnly: 'Trade in for cash',
    cashOnlyHint: 'Skip the upgrade — we\'ll pay you cash (or MoMo) for your device.',
    cashOnlyConfirm: 'You chose cash — no new device. We\'ll offer a cash payout after review.',
    notSureYet: 'Not sure yet',
    nextCondition: 'Next: Device condition',
    /**
     * D6: when trade-in estimate exceeds target price, balance is refunded.
     * Shown when an upgrade device is selected — NOT on the cash-only card.
     */
    d6RefundNote: 'If your trade-in value is higher than the upgrade price, we refund the difference in cash or MoMo at BlackBox.',
    outOfStock: 'Out of stock',
    /**
     * D11: stock_reservation = none — first come, first served; no hold on submit.
     */
    availabilityNote:
      'Availability is first come, first served; stock is confirmed when you visit BlackBox.',
    // TODO(D8): top-up payment method pending client — placeholder until Paystack/on-exchange decided
    topUpPaymentPlaceholder: 'Pay the top-up amount at BlackBox when you drop off your device.',
    continue: 'Continue',
    selectedLabel: 'Selected',
    noStockInCategory: 'No in-stock devices in this category right now.',
  },

  /** Screen 6 — condition questionnaire */
  questionnaire: {
    heading: 'Device condition',
    subheading:
      'Tell us about your device — honest details get you a better offer.',
    progressLabel: 'Condition check',
    questionOf: 'Question',
    gatePowerOn: 'Does your device power on and work normally?',
    gateIcloud: 'Can you sign out of iCloud (turn off Find My)?',
    hardStopHeading: 'We can\'t complete this trade-in online',
    hardStopBody:
      'We can\'t trade this in online — visit BlackBox for further analysis. Thanks for checking.',
    /** D2: iCloud / Find My locked → hard reject (trade_config icloud_locked_policy=hard_stop) */
    hardStopIcloud:
      'Please sign out of iCloud (turn off Find My) before trading in, or visit BlackBox in person for help.',
    hardStopPower:
      'We can\'t accept a device that doesn\'t power on. Visit BlackBox in person for help.',
    thresholdHeading: 'Below trade-in threshold',
    thresholdLeadCapture: 'Leave your details and we\'ll follow up.',
    thresholdLeadName: 'Your name',
    thresholdLeadPhone: 'Phone number',
    thresholdLeadConsent: 'I agree to be contacted about this trade-in enquiry.',
    thresholdLeadSubmit: 'Send my details',
    thresholdLeadDone: 'Thanks — visit BlackBox or wait for our call.',
    answersChangedNote: 'Some answers were changed during this session — our engineer will review.',
    neverSetUp: 'I never set it up',
    notSure: 'Not sure',
    describeIssue: 'Describe the issue',
    describeIssuePlaceholder: 'Optional details…',
    cameraTags: {
      blurry: 'Blurry',
      blank: 'Blank',
      spots: 'Spots',
      other: 'Other',
    },
    liveEstimate: 'Live estimate',
    continueSummary: 'Next: Review',
    backQuestion: 'Back',
    completeHeading: 'Condition check complete',
    pickAnswerHint: 'Select an answer to continue',
  },

  /** Upgrade → Condition → Review phase pills */
  phases: {
    navLabel: 'Trade-in detail steps',
    upgrade: 'Upgrade',
    condition: 'Condition',
    review: 'Review',
  },

  /** Screen 7 — summary (Repair review-card language) */
  summary: {
    heading: 'Review your trade-in',
    subheading: 'Please verify your details before continuing.',
    bannerEyebrow: 'Device & Trade-in Value',
    yourDevice: 'Your device',
    baseValue: 'Base value',
    deductions: 'Deductions',
    tradeInEstimate: 'Trade-in estimate',
    totalEstimate: 'Total Estimate',
    tradingInto: 'You\'re trading into',
    cashOnlySelected: 'Trading in for cash',
    price: 'Price',
    youTopUp: 'You will need to add',
    youReceive: 'You will receive about',
    balanceRefunded: 'You will be refunded the difference via Cash/MoMo',
    refundAmountLabel: 'You will be refunded',
    topUpAmountLabel: 'You will need to add',
    cashReceiveLabel: 'Estimated cash to you',
    estimateIsPreliminary:
      'This figure is a preliminary estimate only. After you submit, we review your device and send you a final offer to accept or decline.',
    validityPrefix: 'Estimate valid for',
    validitySuffix: 'days. Final value confirmed after inspection.',
    disclaimer:
      'This is a preliminary estimate based on your answers. Final value is confirmed after physical inspection at BlackBox. Device must match the condition you described.',
    // TODO(D8): top-up payment method pending client
    topUpPayableAtBlackBox: 'Top-up payable at BlackBox',
    manualReview:
      'Your estimate needs manual review. Our team will contact you with a final offer.',
    continueToDetails: 'Continue to your details',
  },

  /** Screen 8 — contact + IMEI */
  details: {
    heading: 'Your details',
    name: 'Full name',
    phone: 'Phone number',
    phoneHint: 'Ghana mobile number',
    email: 'Email (optional)',
    imei: 'IMEI or serial number',
    imeiHelp: 'Dial *#06# or go to Settings → General → About.',
    imeiInvalid: 'Enter a valid 15-digit IMEI (Luhn check) or a serial of at least 8 letters/numbers.',
    imeiDuplicate: 'An active trade-in already exists for this device.',
    imeiDuplicateWithRef: 'An active request already exists for this device — reference',
    signInRequired: 'Sign in to submit your trade-in request.',
    fulfillment: 'Hand over',
    dropoff: 'Drop off at BlackBox',
    /** D9: inspection / handover is store drop-off only */
    dropoffNote: 'Bring your device to BlackBox — drop-off only (no pickup).',
    storeName: 'BlackBox Ghana',
    storeLocation: 'Visit us in store — ask staff for the trade-in desk.',
    terms: 'I agree to the trade-in terms and confirm the device is mine to sell.',
    termsRequired: 'Please accept the terms to continue.',
    submit: 'Submit trade-in request',
    submitting: 'Submitting…',
    estimateDisclaimerBanner:
      'You\'re submitting an estimate request — not a final price. We\'ll send your final offer after review. You can accept or decline it before bringing your device in.',
    signInToContinue: 'Sign in to continue — we\'ll bring you right back here.',
  },

  /** Screen 9 — confirmation */
  confirmation: {
    heading: 'Trade-in submitted',
    estimateOnlyNote:
      'Your online figure is an estimate only. We\'ll review your answers and send a final offer to this account — you choose whether to accept it.',
    referenceLabel: 'Your reference code',
    trackingHint: 'Track progress anytime from My trade-ins.',
    slaPrefix: 'We aim to respond within',
    slaSuffix: 'hours.',
    nextStepsHeading: 'What happens next',
    step1: 'We review your answers and device details',
    step2: 'You receive a final offer to accept or decline',
    step3: 'Bring your device to BlackBox for inspection & completion',
    viewMyTrades: 'View my trade-ins',
    startAnother: 'Start another trade-in',
    expiresPrefix: 'Estimate expires',
    storeCardHeading: 'Visit BlackBox',
  },

  /** My trade-ins / status */
  myTrades: {
    heading: 'My trade-ins',
    empty: 'No trade-in requests yet.',
    signIn: 'Sign in to see your trade-ins.',
    expired: 'Expired',
    reRun: 'Start a new estimate',
    originalEstimate: 'Online estimate',
    /** Label for the cash amount staff sent after inspection */
    finalOffer: 'Offer sent to you',
    finalOfferPending: 'Awaiting our offer',
    finalOfferHint: 'This is the amount we offered after inspection — not your online estimate.',
    viewTracking: 'View status',
    accept: 'Accept offer',
    decline: 'Decline offer',
    updateError: 'Could not update this request. It may already be scheduled or completed.',
    topUp: 'Top-up',
  },

  /** History / tracking labels for trade-ins */
  history: {
    estimateLabel: 'Online estimate',
    offerLabel: 'Offer sent to you',
    offerPending: 'Pending inspection',
    referencePrefix: 'Trade reference',
  },

  /** Aesthetic grade customer-facing labels (internal keys: a1/a2) */
  aesthetic: {
    likeNew: 'Like new',
    someWear: 'Some visible wear',
    heavilyWorn: 'Heavily worn',
  },

  /** Shared loading / empty / error states */
  states: {
    loading: 'Loading…',
    loadingDevices: 'Loading devices…',
    loadingQuestions: 'Loading questionnaire…',
    loadingEstimate: 'Calculating estimate…',
    emptyDevices: 'No devices available for trade-in right now.',
    emptyTargets: 'No matching devices in stock.',
    errorGeneric: 'Something went wrong. Please try again.',
    errorPricing: 'Unable to load pricing. Please refresh and try again.',
    errorEstimate: 'Could not calculate estimate. Check your selections and try again.',
  },

  /** SIM variant display labels (maps DB sim_variant codes) */
  simLabels: {
    ps: 'Physical SIM',
    es: 'eSIM only',
    single: 'Standard',
    wifi: 'Wi-Fi only',
    cell_ps: 'Cellular — physical SIM',
    cell_es: 'Cellular — eSIM',
  } as const,

  /** Screen 4 short help (spec wording) */
  configHelpShort: 'Not sure? Settings → General → About.',

  /** iPad product_line display labels */
  productLineLabels: {
    pro: 'iPad Pro',
    air: 'iPad Air',
    mini: 'iPad Mini',
    base: 'iPad',
  } as const,

  /** Progress labels for Screens 1–4 stepper */
  flowSteps: {
    type: 'Type',
    category: 'Series',
    model: 'Model',
    config: 'Specs',
    target: 'Upgrade',
    condition: 'Condition',
    summary: 'Summary',
    details: 'Details',
  },

  continue: 'Continue',
  back: 'Back',

  /** Repair-matched collapsed prior-step rows + Change links */
  collapsed: {
    change: 'Change',
    changeModel: 'Change model',
    changeSeries: 'Change series',
    differentModel: 'Different model',
    deviceDetails: 'Device Details',
    tradingInto: 'Trading Into',
    condition: 'Condition Check',
    conditionDone: 'Condition answers submitted',
    conditionInProgress: 'Condition check started',
    estimate: 'Trade-in Estimate',
  },

  /** Status page (public lookup) */
  status: {
    heading: 'Track your trade-in',
    lookupPrompt: 'Enter your reference code and phone number.',
    referenceCode: 'Reference code',
    acceptOffer: 'Accept offer',
    declineOffer: 'Decline offer',
    cancelRequest: 'Cancel request',
    cancelAllowedUntil: 'You can cancel until your visit is scheduled.',
    imeiMasked: 'IMEI ending in',
  },

  /**
   * In-app notification templates (mirrors notify_on_trade_status titles/bodies).
   * WHY: UI empty states / deep-link labels; DB trigger still writes the row.
   */
  notifications: {
    centerHeading: 'Notifications',
    empty: 'No notifications yet.',
    signIn: 'Sign in to see alerts about your trade-ins and orders.',
    markAllRead: 'Mark all read',
    viewTrade: 'View trade-in',
    viewAll: 'View all',
    /** Lifecycle events staff/customers care about */
    tradeSubmittedTitle: 'Trade-in received',
    tradeSubmittedBody: 'We received your trade-in request.',
    tradeOfferTitle: 'Trade-in offer ready',
    tradeOfferBody: 'An offer is ready — review and accept or decline.',
    tradeCompletedTitle: 'Trade-in completed',
    tradeCompletedBody: 'Your trade-in is complete. Thank you.',
  },

  /** Edge-case / error surfaces (customer + staff) */
  errors: {
    rlsDenied: 'You do not have permission to do that. Sign in again or contact support.',
    generic: 'Something went wrong. Please try again.',
    duplicateImei: 'This IMEI already has an open trade-in.',
    outOfStock:
      'Cannot complete: the upgrade target is out of stock. Restock or switch to another variant.',
    restockOrSwitch: 'Restock or switch target',
    switchTargetSaved: 'Target updated. Re-check top-up, then complete again.',
  },
} as const;

/** Type-safe accessor for SIM label lookup */
export function simVariantLabel(code: string): string {
  const key = code as keyof typeof TRADE_COPY.simLabels;
  return TRADE_COPY.simLabels[key] ?? code;
}
