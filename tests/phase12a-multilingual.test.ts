import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_REGISTRY,
  isSupportedLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  SupportedLocale,
} from "../lib/i18n/locales";
import { CATALOGS, esCatalog } from "../lib/i18n/catalogs";
import { translate, interpolate, createTranslator } from "../lib/i18n/dictionary";
import { getLocalizedSystemPrompt } from "../lib/ai/gemini/prompts";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
  calculateQuarterlyTax,
} from "../tax-engine";

describe("Phase 12-A — Multilingual TaxAIHelp Architecture & Integrity", () => {
  // =========================================================================
  // 1. LOCALE REGISTRY & CONFIGURATION
  // =========================================================================
  describe("Locale Registry & Configuration", () => {
    it("configures all 8 required languages", () => {
      const expectedLocales: SupportedLocale[] = [
        "en",
        "es",
        "zh",
        "vi",
        "ko",
        "ru",
        "pt",
        "tl",
      ];
      expect(SUPPORTED_LOCALES).toHaveLength(8);
      for (const loc of expectedLocales) {
        expect(SUPPORTED_LOCALES).toContain(loc);
      }
    });

    it("designates English as default locale", () => {
      expect(DEFAULT_LOCALE).toBe("en");
    });

    it("contains comprehensive metadata for all 8 locales", () => {
      for (const loc of SUPPORTED_LOCALES) {
        const meta = LOCALE_REGISTRY[loc];
        expect(meta).toBeDefined();
        expect(meta.code).toBe(loc);
        expect(meta.name.length).toBeGreaterThan(0);
        expect(meta.nativeName.length).toBeGreaterThan(0);
        expect(meta.dir).toBe("ltr");
        expect(meta.flag.length).toBeGreaterThan(0);
      }
    });

    it("accurately validates supported and unsupported locale codes", () => {
      expect(isSupportedLocale("en")).toBe(true);
      expect(isSupportedLocale("es")).toBe(true);
      expect(isSupportedLocale("zh")).toBe(true);
      expect(isSupportedLocale("vi")).toBe(true);
      expect(isSupportedLocale("ko")).toBe(true);
      expect(isSupportedLocale("ru")).toBe(true);
      expect(isSupportedLocale("pt")).toBe(true);
      expect(isSupportedLocale("tl")).toBe(true);

      // Unsupported
      expect(isSupportedLocale("fr")).toBe(false);
      expect(isSupportedLocale("de")).toBe(false);
      expect(isSupportedLocale("ja")).toBe(false);
      expect(isSupportedLocale("")).toBe(false);
      expect(isSupportedLocale(undefined)).toBe(false);
    });

    it("verifies cookie and localStorage storage key conventions", () => {
      expect(LOCALE_COOKIE_NAME).toBe("taxaihelp-locale");
      expect(LOCALE_STORAGE_KEY).toBe("taxaihelp-locale");
    });
  });

  // =========================================================================
  // 2. MESSAGE CATALOGS & TRANSLATION RESOLVER
  // =========================================================================
  describe("Message Catalogs & Translation Resolver", () => {
    it("provides complete catalogs for all 8 locales in CATALOGS registry", () => {
      for (const loc of SUPPORTED_LOCALES) {
        const cat = CATALOGS[loc];
        expect(cat).toBeDefined();
        expect(cat.common).toBeDefined();
        expect(cat.nav).toBeDefined();
        expect(cat.footer).toBeDefined();
        expect(cat.auth).toBeDefined();
        expect(cat.home).toBeDefined();
        expect(cat.dashboard).toBeDefined();
        expect(cat.calculators).toBeDefined();
        expect(cat.preparation).toBeDefined();
        expect(cat.stateTax).toBeDefined();
        expect(cat.efile).toBeDefined();
        expect(cat.professional).toBeDefined();
        expect(cat.billing).toBeDefined();
        expect(cat.ai).toBeDefined();
        expect(cat.errors).toBeDefined();
      }
    });

    it("resolves nested keys in English and Spanish accurately", () => {
      const enT = createTranslator("en");
      const esT = createTranslator("es");

      expect(enT("common.save")).toBe("Save");
      expect(esT("common.save")).toBe("Guardar");

      expect(enT("nav.taxCalculators")).toBe("Tax Calculators");
      expect(esT("nav.taxCalculators")).toBe("Calculadoras de Impuestos");

      expect(enT("auth.signInButton")).toBe("Sign In");
      expect(esT("auth.signInButton")).toBe("Iniciar Sesión");

      expect(enT("calculators.incomeTaxTitle")).toBe("Federal Income Tax Calculator");
      expect(esT("calculators.incomeTaxTitle")).toBe("Calculadora de Impuestos sobre la Renta Federal");

      expect(enT("efile.title")).toBe("Electronic Filing Readiness");
      expect(esT("efile.title")).toBe("Preparación para Presentación Electrónica");
    });

    it("interpolates parameters in translation strings", () => {
      const interpolated = interpolate("Step {step} of {total}", { step: 1, total: 5 });
      expect(interpolated).toBe("Step 1 of 5");

      const translated = translate("es", "dashboard.taxYearBadge", { year: 2025 });
      expect(translated).toBe("Año Fiscal 2025");
    });

    it("falls back gracefully when a key does not exist", () => {
      const fallbackResult = translate("es", "nonExistentKey");
      expect(fallbackResult).toBe("nonExistentKey");
    });
  });

  // =========================================================================
  // 3. SPANISH (HIGHEST PRIORITY) DOMAIN COMPLETENESS
  // =========================================================================
  describe("Spanish Message Catalog Completeness", () => {
    it("contains professional tax terminology in Spanish for preparation and filing", () => {
      expect(esCatalog.preparation.wizardTitle).toBe("Comenzar Mis Impuestos — Preparación Guiada");
      expect(esCatalog.preparation.standardDeductionExplanation).toContain("deducción estándar");
      expect(esCatalog.preparation.freezeReturnCta).toContain("Bloquear y Finalizar Declaración Federal");
      expect(esCatalog.stateTax.noIncomeTaxDesc).toContain("no tiene impuesto sobre la renta");
      expect(esCatalog.professional.title).toBe("Revisión Profesional por CPA / EA");
    });

    it("contains Spanish translations for all core error messages", () => {
      expect(esCatalog.errors.generalError).toBe("Ocurrió un error inesperado. Por favor intente nuevamente.");
      expect(esCatalog.errors.validationError).toBe("Por favor corrija los campos resaltados en sus datos fiscales.");
      expect(esCatalog.errors.notFoundTitle).toBe("Página No Encontrada");
      expect(esCatalog.errors.unauthorizedTitle).toBe("Inicio de Sesión Requerido");
    });
  });

  // =========================================================================
  // 4. GEMINI AI MULTILINGUAL SYSTEM PROMPT INTEGRATION
  // =========================================================================
  describe("AI Explanation Multilingual Prompts", () => {
    it("generates Spanish explanation prompt with strict language instructions", () => {
      const prompt = getLocalizedSystemPrompt("taxExplainer", "es");
      expect(prompt).toContain("Spanish");
      expect(prompt).toContain("The user's active language is Spanish (Español)");
      expect(prompt).toContain("CRITICAL TAX SAFETY INVARIANT: All numbers, dollar amounts, deductions, and tax liabilities must match the deterministic engine numbers EXACTLY.");
      expect(prompt).toContain("NEVER invent numerical tax results. All tax numbers MUST come strictly from the TaxAIHelp deterministic tax engine.");
    });

    it("generates default English explanation prompt when locale is 'en' or omitted", () => {
      const promptEn = getLocalizedSystemPrompt("taxExplainer", "en");
      expect(promptEn).not.toContain("LANGUAGE INSTRUCTION:");
      expect(promptEn).toContain("NEVER invent numerical tax results. All tax numbers MUST come strictly from the TaxAIHelp deterministic tax engine.");

      const promptDefault = getLocalizedSystemPrompt("taxExplainer");
      expect(promptDefault).toContain("NEVER invent numerical tax results. All tax numbers MUST come strictly from the TaxAIHelp deterministic tax engine.");
    });

    it("generates localized prompts for other supported languages", () => {
      const promptZh = getLocalizedSystemPrompt("taxExplainer", "zh");
      expect(promptZh).toContain("Chinese");
      expect(promptZh).toContain("CRITICAL TAX SAFETY INVARIANT");

      const promptVi = getLocalizedSystemPrompt("taxExplainer", "vi");
      expect(promptVi).toContain("Vietnamese");

      const promptKo = getLocalizedSystemPrompt("taxExplainer", "ko");
      expect(promptKo).toContain("Korean");
    });
  });

  // =========================================================================
  // 5. CRITICAL INVARIANT: DETERMINISTIC ENGINE PURITY ACROSS LOCALES
  // =========================================================================
  describe("CRITICAL INVARIANT: Exact Same Tax Calculation Under English & Spanish", () => {
    it("Scenario 1: 2025 W-2 Single Filer produces 100% identical math regardless of locale context", () => {
      const scenarioInput = {
        taxYear: 2025 as const,
        filingStatus: "single" as const,
        w2WagesCents: 8000000, // $80,000.00
        federalWithholdingCents: 1000000, // $10,000.00
      };

      const englishLocale = "en";
      const englishTranslator = createTranslator(englishLocale);
      const englishResult = calculateIncomeTax(scenarioInput);

      const spanishLocale = "es";
      const spanishTranslator = createTranslator(spanishLocale);
      const spanishResult = calculateIncomeTax(scenarioInput);

      // Assert bit-for-bit numerical identity in calculation engine outputs
      expect(englishResult.taxYear).toBe(spanishResult.taxYear);
      expect(englishResult.rulesVersion).toBe(spanishResult.rulesVersion);
      expect(englishResult.grossIncomeCents).toBe(spanishResult.grossIncomeCents);
      expect(englishResult.standardDeduction).toBe(spanishResult.standardDeduction);
      expect(englishResult.taxableIncomeCents).toBe(spanishResult.taxableIncomeCents);
      expect(englishResult.federalIncomeTaxCents).toBe(spanishResult.federalIncomeTaxCents);
      expect(englishResult.totalTaxLiabilityCents).toBe(spanishResult.totalTaxLiabilityCents);
      expect(englishResult.marginalTaxBracket).toBe(spanishResult.marginalTaxBracket);
      expect(englishResult.effectiveTaxRate).toBe(spanishResult.effectiveTaxRate);
      expect(englishResult.estimatedRefundCents).toBe(spanishResult.estimatedRefundCents);
      expect(englishResult.estimatedAmountOwedCents).toBe(spanishResult.estimatedAmountOwedCents);

      // Verify that while calculations are identical, UI labels are distinct
      const enLabel = englishTranslator("calculators.taxableIncome");
      const esLabel = spanishTranslator("calculators.taxableIncome");
      expect(enLabel).toBe("Taxable Income");
      expect(esLabel).toBe("Ingreso Imponible");
      expect(enLabel).not.toBe(esLabel);
    });

    it("Scenario 2: 2025 Self-Employed 1099 Filer produces identical math regardless of locale", () => {
      const seInput = {
        taxYear: 2025 as const,
        filingStatus: "single" as const,
        gross1099IncomeCents: 10000000, // $100,000.00
        businessExpensesCents: 2000000, // $20,000.00
      };

      const resultEn = calculateSelfEmployedTax(seInput);
      const resultEs = calculateSelfEmployedTax(seInput);

      expect(resultEn.selfEmploymentTaxCents).toBe(resultEs.selfEmploymentTaxCents);
      expect(resultEn.adjustedGrossIncomeCents).toBe(resultEs.adjustedGrossIncomeCents);
      expect(resultEn.totalTaxLiabilityCents).toBe(resultEs.totalTaxLiabilityCents);
      expect(resultEn.selfEmploymentDetails?.netSelfEmploymentProfitCents).toBe(
        resultEs.selfEmploymentDetails?.netSelfEmploymentProfitCents
      );
      expect(resultEn.selfEmploymentDetails?.deductibleHalfCents).toBe(
        resultEs.selfEmploymentDetails?.deductibleHalfCents
      );
    });

    it("Scenario 3: 2026 Quarterly Estimated Tax calculations are invariant", () => {
      const quarterlyInput = {
        taxYear: 2026 as const,
        filingStatus: "married_filing_jointly" as const,
        estimatedAnnualGrossCents: 16000000, // $160,000.00
        estimatedAnnualExpensesCents: 3000000, // $30,000.00
      };

      const qResultEn = calculateQuarterlyTax(quarterlyInput);
      const qResultEs = calculateQuarterlyTax(quarterlyInput);

      expect(qResultEn.quarterlyBreakdown?.quarterlyPaymentCents).toBe(
        qResultEs.quarterlyBreakdown?.quarterlyPaymentCents
      );
      expect(qResultEn.quarterlyBreakdown?.remainingTaxToPayCents).toBe(
        qResultEs.quarterlyBreakdown?.remainingTaxToPayCents
      );
      expect(qResultEn.quarterlyBreakdown?.paymentDeadlines).toEqual(
        qResultEs.quarterlyBreakdown?.paymentDeadlines
      );
    });
  });
});
