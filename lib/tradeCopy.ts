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
    summaryDevice: 'Phone you’re trading in',
    summarySpecs: 'Specs',
    summaryTarget: 'Phone you’re trading into',
    summaryEstimate: 'You add / receive',
    summaryEstimateNote: 'Estimate only — final price after team review',
    summaryPending: 'Balance appears after condition check',
    summaryYouAdd: 'You add',
    summaryYouReceive: 'You receive',
    summaryEven: 'No top-up needed',
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
    imei1: 'IMEI 1',
    imei2: 'IMEI 2 (dual SIM)',
    serialNumber: 'Serial number',
    imeiHelp: 'Dial *#06# or go to Settings → General → About.',
    imei1Help: 'Optional · 15 digits. Helps us match your device at drop-off.',
    imei2Help: 'Optional · second 15-digit IMEI for dual-SIM phones only.',
    serialHelp: 'Optional · 8–20 letters or numbers from Settings → About.',
    imeiInfoTitle: 'How to find your IMEI / serial',
    imeiInfoBody:
      'On iPhone or iPad: dial *#06# or open Settings → General → About. Use the IMEI (15 digits) when shown, or the serial number. These fields are optional — you can continue without them and share details at the store.',
    imei1InfoTitle: 'How to find IMEI 1',
    imei1InfoBody:
      'Dial *#06# on the keypad, or go to Settings → General → About and look for IMEI or IMEI1. It is exactly 15 digits. Optional — leave blank if you do not have it yet.',
    imei2InfoTitle: 'How to find IMEI 2',
    imei2InfoBody:
      'Dial *#06# or open Settings → General → About. Dual-SIM devices show IMEI and IMEI2 (or IMEI1 / IMEI2). Leave blank if your device has only one IMEI.',
    serialInfoTitle: 'How to find the serial number',
    serialInfoBody:
      'Go to Settings → General → About and look for Serial Number. You can also find it on the original box or SIM tray. Optional — leave blank if you prefer to share it at drop-off.',
    imeiInvalid: 'Enter a valid 15-digit IMEI, or a serial of at least 8 letters or numbers.',
    imei1Invalid:
      'IMEI 1 is incomplete. It needs exactly 15 digits, or clear the field to continue without it.',
    imei2Invalid:
      'IMEI 2 is incomplete. It needs exactly 15 digits, or clear the field to continue without it.',
    serialInvalid:
      'Serial is incomplete. Use 8–20 letters/numbers, or clear the field to continue without it.',
    identityRequired: 'IMEI and serial are optional — fix incomplete entries or clear them to continue.',
    identityOptionalNote:
      'IMEI and serial are optional. If you start typing one, finish it (or clear it) before continuing.',
    helpText:
      'Not sure of your storage or SIM type? Check Settings → General → About.',
    colorNote: 'Color is for identification only — it does not affect your trade-in value.',
  },

  /** Screen 5 — target device */
  target: {
    heading: 'What are you upgrading to?',
    subheading: 'Optional — helps us tailor your trade-in offer.',
    pickHint: 'First pick the phone you want. Then choose storage, SIM, RAM, and colour — and confirm the details.',
    browseByCategory: 'Shop by category',
    pickModel: 'Select a model',
    configureSku: 'Choose your version',
    configureHint:
      'Tell us the storage, SIM type, and colour you want — we’ll match stock at BlackBox.',
    askStorage: 'Which storage do you want?',
    askSim: 'Physical SIM or eSIM?',
    askRam: 'Which RAM?',
    askColor: 'Which colour?',
    yourSelection: 'Your upgrade',
    reviewHeading: 'Confirm your upgrade',
    reviewSubheading: 'Check storage, RAM, SIM, and colour before you continue.',
    reviewDetails: 'Upgrade details',
    changeConfig: 'Change options',
    confirmUpgrade: 'Looks good — continue',
    detailStorage: 'Storage',
    detailRam: 'RAM',
    detailSim: 'SIM',
    detailColor: 'Colour',
    detailPrice: 'Price',
    detailAvailability: 'Availability',
    availabilityInStock: 'In stock',
    availabilityPreference: 'Preference noted',
    preferenceNote:
      'This exact combo isn’t listed in stock right now — we’ll note your preference.',
    storage: 'Storage',
    ram: 'RAM',
    simType: 'SIM type',
    color: 'Color',
    price: 'Price',
    cashOnly: 'Trade in for cash',
    cashOnlyHint: 'Skip the upgrade — we\'ll pay you cash (or MoMo) for your device.',
    cashOnlyConfirm: 'You chose cash — no new device. We\'ll offer a cash payout after review.',
    notSureYet: 'Not sure yet',
    nextCondition: 'Next: Device condition',
    reviewUpgrade: 'Review upgrade',
    /**
     * D6: when trade-in estimate exceeds target price, balance is refunded.
     * Shown when an upgrade device is selected — NOT on the cash-only card.
     */
    d6RefundNote: 'If your trade-in value is higher than the upgrade price, we refund the difference in cash or MoMo at BlackBox.',
    outOfStock: 'Out of stock',
    /**
     * D11: stock_reservation=none — first come, first served; no hold on submit.
     * UI banner removed — customers don’t need the “confirmed at shop” note.
     */
    availabilityNote: '',
    // TODO(D8): top-up payment method pending client — placeholder until Paystack/on-exchange decided
    topUpPaymentPlaceholder: 'Pay the top-up amount at BlackBox when you drop off your device.',
    continue: 'Continue',
    selectedLabel: 'Selected',
    noStockInCategory: 'No in-stock devices in this category right now.',
    noConfigOptions:
      'This model has no storage or SIM options set up yet. Pick another, or ask BlackBox to add them.',
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
    thresholdHeading: 'Value too low for online trade-in',
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
    liveEstimate: 'Live balance',
    liveTopUp: 'You add',
    liveRefund: 'Balance to you',
    liveCash: 'Cash to you',
    liveEven: 'No top-up — even',
    /** Mini math under the live ticker while answering */
    liveUpgradePrice: 'Phone you’re trading into',
    liveTradeCredit: 'Value of your trade-in (after condition)',
    liveBaseValue: 'Starting value of your phone',
    liveDeductions: 'Condition deductions (reduce your phone’s value)',
    liveTopUpHint:
      'Example: your phone starts at ₵6,000, screen damage brings it to ₵3,000, trading into a ₵10,000 phone → you add ₵7,000.',
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

  /** Screen 7 — summary: headline = top-up (red), even (yellow), or balance to you (green) */
  summary: {
    heading: 'What you pay (or receive)',
    subheading: 'Check your balance. Tap “How the numbers work” if you want a quick walkthrough.',
    bannerEyebrow: 'Your upgrade balance',
    headlineEvenHint: 'Your trade-in credit covers the upgrade — nothing extra to add.',
    yourDevice: 'Phone you’re trading in',
    baseValue: 'Starting value of your phone',
    deductions: 'Condition deductions (e.g. screen damage)',
    tradeInCredit: 'Your phone’s value after deductions',
    tradeInEstimate: 'Trade-in estimate',
    totalEstimate: 'Your phone’s value after deductions',
    headlineTopUp: 'You add to get this upgrade',
    headlineRefund: 'Balance we pay you',
    headlineEven: 'No extra to pay',
    headlineCash: 'Estimated cash to you',
    tradingInto: 'You’re trading into',
    cashOnlySelected: 'Trading in for cash',
    price: 'Price of the phone you’re trading into',
    youTopUp: 'You will need to add',
    youReceive: 'You will receive about',
    balanceRefunded: 'We refund the difference in cash or MoMo at BlackBox.',
    refundAmountLabel: 'Balance to you',
    topUpAmountLabel: 'Top-up to pay',
    cashReceiveLabel: 'Estimated cash to you',
    howItWorksTitle: 'How the numbers work',
    howItWorksFrontHint: 'Starting value → condition → what you add',
    howItWorksTap: 'Flip',
    howItWorksFlipBack: 'Back',
    howItWorksSteps: [
      'Start = your phone in good condition.',
      'Damage (screen, battery…) reduces that.',
      'What’s left comes off the upgrade price.',
    ],
    howItWorksExampleLabel: 'Example',
    howItWorksExample: '₵6k − damage → ₵3k credit. Into ₵10k → add ₵7k.',
    howItWorksBody:
      'Start = phone in good condition. Damage reduces it. What’s left comes off the upgrade. Example: ₵6k → ₵3k credit into ₵10k = add ₵7k.',
    estimateIsPreliminary:
      'Not the final price — we’ll send that after our team reviews.',
    validityPrefix: 'Valid',
    validitySuffix: 'days. Final price after team review.',
    disclaimer:
      'Estimate only. Final offer comes after review — accept or decline before drop-off.',
    // TODO(D8): top-up payment method pending client
    topUpPayableAtBlackBox: 'Pay this top-up at BlackBox when you drop off.',
    manualReview:
      'Your estimate needs manual review. Our team will contact you with a final offer.',
    continueToDetails: 'Continue to your details',
  },

  /** Screen 8 — contact + IMEI */
  details: {
    heading: 'Your details',
    name: 'Full name',
    nameRequired: 'Enter your full name so we can contact you about this trade-in.',
    phone: 'Phone number',
    phoneHint: 'Ghana mobile number',
    phoneRequired: 'Enter your Ghana mobile number so we can reach you with the offer.',
    phoneInvalid:
      'That phone number doesn’t look right. Use a Ghana mobile like 024XXXXXXX or +23324XXXXXXX.',
    email: 'Email (optional)',
    emailInvalid: 'That email doesn’t look right. Check the spelling, or leave it blank.',
    imei: 'IMEI or serial number',
    imeiHelp: 'Dial *#06# or go to Settings → General → About.',
    imeiInvalid: 'Enter a valid 15-digit IMEI, or a serial of at least 8 letters or numbers.',
    imeiDuplicate: 'An active trade-in already exists for this device.',
    imeiDuplicateWithRef: 'An active request already exists for this device — reference',
    signInRequired: 'Sign in to submit your trade-in request.',
    fulfillment: 'Hand over',
    dropoff: 'Drop off at BlackBox',
    /** D9: inspection / handover is store drop-off only */
    dropoffNote:
      'Bring your device to BlackBox — drop-off only (no pickup). Staff will confirm IMEI / serial in store.',
    storeName: 'BlackBox Ghana',
    storeLocation: 'Visit us in store — ask staff for the trade-in desk.',
    terms: 'I agree to the trade-in terms and confirm the device is mine to sell.',
    termsRequired: 'Tick the box to confirm the device is yours and you agree to the trade-in terms.',
    incompleteFlow:
      'Your trade-in details are incomplete. Go back and finish the device, upgrade, and condition steps, then try again.',
    submit: 'Submit trade-in request',
    submitting: 'Submitting…',
    estimateDisclaimerBanner:
      'This is an estimate only — not the final price. After you submit, our team reviews your request and sends you the final offer. You can accept or decline it before bringing your device in.',
    estimateDisclaimerTitle: 'Estimate only',
    signInToContinue: 'Sign in to continue — we\'ll bring you right back here.',
  },

  /** Screen 9 — confirmation */
  confirmation: {
    heading: 'Trade-in submitted',
    estimateOnlyTitle: 'Estimate only — final price comes next',
    estimateOnlyNote:
      'What you saw online is an estimate, not the final price. Our team will review your request and send the final offer to this account. You choose whether to accept it.',
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
    emptyDevices: 'No devices available for trade-in in this series right now.',
    emptyDevicesHint:
      'Staff must list the model under Tradable devices and set an active starting price under Prices before it appears here.',
    emptyTargets:
      'No upgrade phones are listed yet. Choose cash trade-in, or ask staff to link shop products (Matching trade-in model) and publish Upgrade phones.',
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
      'Cannot complete: the upgrade target is out of stock. Restock or switch to another upgrade option.',
    restockOrSwitch: 'Restock or switch target',
    switchTargetSaved: 'Target updated. Re-check top-up, then complete again.',
  },
} as const;

/** Type-safe accessor for SIM label lookup */
export function simVariantLabel(code: string): string {
  const key = code as keyof typeof TRADE_COPY.simLabels;
  return TRADE_COPY.simLabels[key] ?? code;
}
