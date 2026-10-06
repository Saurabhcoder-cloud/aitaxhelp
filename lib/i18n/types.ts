/**
 * TaxAIHelp Translation Catalog Types — Phase 12-A
 */

export interface CommonTranslations {
  loading: string;
  save: string;
  cancel: string;
  continue: string;
  back: string;
  submit: string;
  calculate: string;
  edit: string;
  delete: string;
  download: string;
  print: string;
  export: string;
  close: string;
  refresh: string;
  viewDetails: string;
  step: string;
  of: string;
  optional: string;
  required: string;
  yes: string;
  no: string;
  completed: string;
  inProgress: string;
  notStarted: string;
  ready: string;
  offline: string;
  warning: string;
  error: string;
  success: string;
  status: string;
  actions: string;
  selectLanguage: string;
  usTaxIntelligence: string;
  deterministicMathNotice: string;
  officialIrsVerifiedNotice: string;
}

export interface NavTranslations {
  taxCalculators: string;
  incomeTaxCalculator: string;
  selfEmployedCalculator: string;
  contractor1099Calculator: string;
  quarterlyTaxCalculator: string;
  calculator2025: string;
  calculator2026: string;
  allCalculatorsHub: string;
  taxGuides: string;
  blog: string;
  aiTaxAssistant: string;
  pricing: string;
  about: string;
  contact: string;
  faq: string;
  signIn: string;
  signOut: string;
  createAccount: string;
  dashboard: string;
  startMyTaxes: string;
  calculateYourTaxes: string;
  taxpayerAccount: string;
}

export interface FooterTranslations {
  tagline: string;
  calculatorsHeading: string;
  resourcesHeading: string;
  companyHeading: string;
  legalHeading: string;
  complianceNotice: string;
  disclaimerText: string;
  privacyPolicy: string;
  termsOfService: string;
  disclaimer: string;
  allRightsReserved: string;
}

export interface AuthTranslations {
  welcomeBack: string;
  signInSubtitle: string;
  createAccountTitle: string;
  createAccountSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  forgotPasswordPrompt: string;
  forgotPasswordTitle: string;
  forgotPasswordSubtitle: string;
  sendResetLink: string;
  backToSignIn: string;
  signInButton: string;
  signingIn: string;
  creatingAccount: string;
  createAccountButton: string;
  noAccountPrompt: string;
  alreadyHaveAccountPrompt: string;
  demoAccountButton: string;
  orContinueWith: string;
  sessionTerminated: string;
  emailRequired: string;
  passwordRequired: string;
  passwordMismatch: string;
  authFailed: string;
  accountCreatedSuccess: string;
}

export interface HomeTranslations {
  heroHeadlinePrefix: string;
  heroHeadlineHighlight: string;
  heroSubtitle: string;
  startMyTaxesCta: string;
  exploreCalculatorsCta: string;
  badgeEngine: string;
  irbVerified: string;
  deterministicNotice: string;
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  aiAssistantHeading: string;
  aiAssistantSubheading: string;
  trustTitle: string;
  trustSubtitle: string;
}

export interface DashboardTranslations {
  title: string;
  subtitle: string;
  activeSessionCardTitle: string;
  taxYearBadge: string;
  progressPercent: string;
  resumePreparation: string;
  startNewReturn: string;
  recentCalculationsTitle: string;
  cpaReviewStatusTitle: string;
  efileReadinessTitle: string;
  stateReturnsTitle: string;
  billingSummaryTitle: string;
  notificationsTitle: string;
  quickToolsTitle: string;
}

export interface CalculatorTranslations {
  incomeTaxTitle: string;
  incomeTaxSubtitle: string;
  selfEmployedTitle: string;
  selfEmployedSubtitle: string;
  contractor1099Title: string;
  contractor1099Subtitle: string;
  quarterlyTaxTitle: string;
  quarterlyTaxSubtitle: string;
  taxYearLabel: string;
  filingStatusLabel: string;
  w2IncomeLabel: string;
  gross1099Label: string;
  expensesLabel: string;
  withholdingLabel: string;
  estimatedGrossLabel: string;
  estimatedExpensesLabel: string;
  calculateButton: string;
  calculating: string;
  summaryTitle: string;
  grossIncome: string;
  standardDeduction: string;
  taxableIncome: string;
  totalTax: string;
  effectiveRate: string;
  marginalRate: string;
  balanceDue: string;
  estimatedRefund: string;
  seTaxBreakdown: string;
  quarterlyInstallment: string;
  saveCalculation: string;
  compare2025vs2026: string;
}

export interface PreparationTranslations {
  wizardTitle: string;
  stepProfileTitle: string;
  stepHouseholdTitle: string;
  stepIncomeTitle: string;
  stepDeductionsTitle: string;
  stepSummaryTitle: string;
  stepReviewTitle: string;
  stepStateTitle: string;
  stepProfessionalTitle: string;
  stepFilingTitle: string;

  // Profile
  fullNameLabel: string;
  filingStatusTitle: string;
  filingStatusSingle: string;
  filingStatusMfj: string;
  filingStatusMfs: string;
  filingStatusHoh: string;
  filingStatusQss: string;
  spouseSectionTitle: string;
  spouseNameLabel: string;
  hasDependentsPrompt: string;
  dependentsTitle: string;
  addDependentButton: string;
  dependentNameLabel: string;
  dependentRelationshipLabel: string;
  dependentMonthsLivedLabel: string;
  qualifiesChildTaxCredit: string;

  // Income
  incomeDiscoveryTitle: string;
  hasW2Prompt: string;
  addW2Button: string;
  employerNameLabel: string;
  w2Box1WagesLabel: string;
  w2Box2WithholdingLabel: string;
  has1099Prompt: string;
  add1099Button: string;
  payerNameLabel: string;
  income1099AmountLabel: string;
  hasGigSelfEmployedPrompt: string;
  businessNameLabel: string;
  grossReceiptsLabel: string;
  allowableExpensesLabel: string;

  // Deductions & Credits
  deductionsTitle: string;
  standardDeductionExplanation: string;
  hasItemizedPrompt: string;
  mortgageInterestLabel: string;
  charitableLabel: string;
  medicalExpensesLabel: string;
  stateLocalTaxesLabel: string;
  earnedIncomeCreditTitle: string;
  childTaxCreditTitle: string;

  // Summary & Review
  summaryTitle: string;
  readinessTitle: string;
  readinessReady: string;
  readinessIssuesFound: string;
  official1040Preview: string;
  form1040LineBreakdown: string;
  downloadSummaryPdf: string;
  freezeReturnCta: string;
  returnFrozenNotice: string;
}

export interface StateTaxTranslations {
  title: string;
  subtitle: string;
  selectStateLabel: string;
  noIncomeTaxTitle: string;
  noIncomeTaxDesc: string;
  californiaEngineTitle: string;
  californiaForm540: string;
  caStandardDeduction: string;
  caTaxCredit: string;
  caEstimatedLiability: string;
  unsupportedStateNotice: string;
  stateReadinessChecked: string;
  paperFilingRequired: string;
}

export interface EfileTranslations {
  title: string;
  providerStatusTitle: string;
  transmissionStatus: string;
  disconnectedHeadline: string;
  disconnectedNotice: string;
  paperFilingInstructionsTitle: string;
  stepDownloadForms: string;
  stepSignDate: string;
  stepAttachW2: string;
  stepMailToIrs: string;
  findMailingAddress: string;
  noFakeFilingDisclaimer: string;
}

export interface ProfessionalTranslations {
  title: string;
  subtitle: string;
  requestReviewCta: string;
  assignedCpaTitle: string;
  reviewStatusPending: string;
  reviewStatusInProgress: string;
  reviewStatusChangesRequested: string;
  reviewStatusApproved: string;
  reviewerNotesTitle: string;
  submitNoteButton: string;
  matchingDisclaimer: string;
}

export interface BillingTranslations {
  pricingTitle: string;
  pricingSubtitle: string;
  monthlyInterval: string;
  annualInterval: string;
  currentPlanBadge: string;
  upgradeCta: string;
  customerPortalCta: string;
  freeTierTitle: string;
  freeTierPrice: string;
  premiumTierTitle: string;
  premiumTierPriceMonthly: string;
  premiumTierPriceAnnual: string;
  proTierTitle: string;
  proTierPrice: string;
  billingHistoryTitle: string;
}

export interface AITranslations {
  assistantName: string;
  assistantRole: string;
  inputPlaceholder: string;
  sendButton: string;
  thinking: string;
  disclaimer: string;
  suggestedQuestionsTitle: string;
  suggestion1: string;
  suggestion2: string;
  suggestion3: string;
  calculationContextNotice: string;
  explainingVerifiedMath: string;
}

export interface ErrorTranslations {
  generalError: string;
  networkError: string;
  validationError: string;
  notFoundTitle: string;
  notFoundMessage: string;
  unauthorizedTitle: string;
  unauthorizedMessage: string;
  forbiddenTitle: string;
  forbiddenMessage: string;
  rateLimitExceeded: string;
  emptyStateTitle: string;
  emptyStateMessage: string;
}

export interface TranslationCatalog {
  common: CommonTranslations;
  nav: NavTranslations;
  footer: FooterTranslations;
  auth: AuthTranslations;
  home: HomeTranslations;
  dashboard: DashboardTranslations;
  calculators: CalculatorTranslations;
  preparation: PreparationTranslations;
  stateTax: StateTaxTranslations;
  efile: EfileTranslations;
  professional: ProfessionalTranslations;
  billing: BillingTranslations;
  ai: AITranslations;
  errors: ErrorTranslations;
}
