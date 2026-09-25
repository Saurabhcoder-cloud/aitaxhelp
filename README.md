# TaxAIHelp — Smarter Tax Help, Powered by AI

[![Domain](https://img.shields.io/badge/domain-taxaihelp.com-blue.svg)](https://taxaihelp.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.18-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.14-38B2AC.svg)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Zod-3.23.8-purple.svg)](https://zod.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1.3-yellow.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

> **Brand Positioning:** “Smarter Tax Help, Powered by AI”  
> **Target Market:** United States (Individual Taxpayers, Freelancers, 1099 Contractors, Self-Employed, Small Businesses)  
> **Tax Engine Version:** `1.1.0-production-baseline`  
> **Default Tax Year:** 2025 (IRS IRB 2025-45 / P.L. 119-21 OBBBA)  
> **Target Baselines:** Tax Year 2025 (IRB 2025-45) & Tax Year 2026 (IRS Rev. Proc. 2025-32)

---

## 1. Project Purpose

TaxAIHelp is an educational fintech platform designed to clarify US federal tax obligations. It pairs a **deterministic, integer-cents tax calculation engine** with **conversational AI guidance** powered by Google Gemini, helping taxpayers model their liabilities, identify legitimate deductions, and plan quarterly estimated tax installments.

---

## 2. Technology Stack & Exact Verified Package Versions

- **Next.js:** `^14.2.18` (App Router, Server Components & Route Handlers)
- **React:** `^18.3.1` (with `react-dom: ^18.3.1`)
- **TypeScript:** `^5.6.3` (Strict Type Checking, Zero `any`)
- **Tailwind CSS:** `^3.4.14` (Custom financial SaaS design system)
- **Zod:** `^3.23.8` (Runtime schema validation for tax inputs and API payloads)
- **Vitest:** `^2.1.3` (Deterministic unit testing for calculation rules and API contracts)
- **ESLint:** `^8.57.1` (with `eslint-config-next: ^14.2.18`)

*All dependencies are internally compatible and verified.*

---

## 3. Supported & Unsupported Tax Features

### Currently Supported Baseline
- Form 1040 W-2 ordinary employment wages
- 1099-NEC / 1099-MISC / Schedule C gross business revenues
- Documented ordinary business expenses
- Statutory standard deduction (Single, MFJ, MFS, HoH, QSS)
- Deductible half of self-employment tax (above-the-line adjustment to AGI)
- Seven-bracket federal progressive income tax (10%, 12%, 22%, 24%, 32%, 35%, 37%)
- Self-employment tax (Schedule SE: 12.4% OASDI capped, 2.9% uncapped Medicare, 92.35% statutory net earnings factor)
- Social Security wage base boundary capping with W-2 wage offset
- Federal withholding offsetting
- Form 1040-ES quarterly estimated tax installment calculations (4 equal vouchers)

### Explicitly Excluded / Unsupported Baseline (Structured Warnings)
- **State and Local Income Taxes:** Federal tax modeling only.
- **Itemized Deductions (Schedule A):** UI forms strictly offer Standard Deduction; API returns structured warning `ITEMIZED_DEDUCTIONS_UNSUPPORTED` if itemized fields are submitted.
- **Child Tax Credit (CTC) & Earned Income Tax Credit (EITC):** Excluded from the current baseline.
- **Student Loan Interest Deduction:** Excluded from the current baseline.
- **Qualified Business Income (QBI, IRC § 199A):** Excluded from the current baseline.
- **Additional Medicare Tax (Form 8959, 0.9%):** Excluded from the current baseline.
- **Tax E-Filing & Direct Submission:** Educational modeling and planning only.

---

## 4. Authoritative Tax Source Registry

Every tax calculation rule is backed by official government documentation:

| Tax Year | Status | IRS / Federal Citation | Implementation | Tests |
| :--- | :--- | :--- | :--- | :--- |
| **2026** | **Target Baseline** | IRS Rev. Proc. 2025-32 & SSA 2026 ($184,500 OASDI cap) | `tax-engine/rules/2026/` | `tax-engine/tests/*-2026.test.ts` |
| **2025** | **Production Default** | IRS IRB 2025-45 (OBBBA) & SSA 2025 ($176,100 OASDI cap) | `tax-engine/rules/2025/` | `tax-engine/tests/*-2025.test.ts` |
| **2024** | **Historical Baseline** | IRS Rev. Proc. 2023-34 & SSA 2024 ($168,600 OASDI cap) | `tax-engine/rules/2024/` | `tests/tax-engine.test.ts` |
| **2023** | **Historical Baseline** | IRS Rev. Proc. 2022-38 & SSA 2023 ($160,200 OASDI cap) | `tax-engine/rules/2023/` | `tests/tax-engine.test.ts` |

### Statutory Standard Deductions (Integer Cents)
- **Tax Year 2025 (IRS IRB 2025-45 / OBBBA):**
  - Single / MFS: $15,750 (1,575,000 cents)
  - Married Filing Jointly / Surviving Spouse: $31,500 (3,150,000 cents)
  - Head of Household: $23,625 (2,362,500 cents)
- **Tax Year 2026 (IRS Rev. Proc. 2025-32):**
  - Single / MFS: $16,100 (1,610,000 cents)
  - Married Filing Jointly / Surviving Spouse: $32,200 (3,220,000 cents)
  - Head of Household: $24,150 (2,415,000 cents)

---

## 5. Architectural Invariants

### A. The Pure Tax Engine (Single Source of Truth)
- **AI does NOT calculate taxes.** Large Language Models are probabilistic and prone to math hallucinations.
- All monetary calculations execute within `tax-engine/` using pure, deterministic algorithms operating strictly in **integer cents** ($1.00 = 100 cents).
- Zero floating-point roundoff errors.

### B. The AI Governance Boundary
```
User Prompt
  ↓
Gemini Intent Extraction (lib/ai/gemini/)
  ↓
Zod Runtime Validation
  ↓
Deterministic Tax Engine (tax-engine/)
  ↓
Verified Calculation Result (Single Source of Truth)
  ↓
Gemini Plain-English Explanation
  ↓
User Interface Presentation
```

### C. Security & Error Handling
- **Server-Only Secrets:** `GEMINI_API_KEY` is strictly a server-side environment variable. Never expose it with `NEXT_PUBLIC_`.
- **Sanitized Errors:** API route error handler (`lib/utils/errors.ts`) automatically strips database traces, credentials, and internal stack dumps.
- **Client Anonymity:** Tax calculations can be performed anonymously without collecting personally identifiable information.

---

## 6. Directory Structure

```
e:\USA TAX Project\
├── app/                  # Next.js 14 App Router routes & API endpoints
├── components/           # Reusable UI, layout, home, and calculator components
├── lib/                  # Utilities, Gemini AI service, Supabase, SEO metadata
├── tax-engine/           # Isolated deterministic tax calculation engine
│   ├── rules/            # Official immutable IRS rule modules (2026, 2025, 2024, 2023)
│   ├── calculations/     # Pure calculations (deductions, income tax, Schedule SE, quarterly)
│   ├── validation/       # Zod schemas for all tax inputs
│   └── tests/            # Dedicated Vitest unit & boundary suites
├── types/                # TypeScript domain contracts
├── supabase/             # PostgreSQL schema blueprint & migration documentation
├── docs/                 # ARCHITECTURE.md, TAX_ENGINE_SPEC.md, and AI_GOVERNANCE.md
├── tests/                # Top-level API and integration test suites
├── public/               # Static assets, robots, favicon
└── .env.example          # Environment variables template
```

---

## 7. Local Development Setup

### Prerequisites
- Node.js 18.17+ or 20+
- npm 9+

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Run the deterministic test suite
npm test

# 3. Run ESLint code quality checks
npm run lint

# 4. Run TypeScript strict type verification
npx tsc --noEmit

# 5. Build for production validation
npm run build

# 6. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 8. Environment Configuration

Create `.env.local` based on `.env.example`:

```env
# Application URL
NEXT_PUBLIC_SITE_URL=https://taxaihelp.com

# Supabase (Client-safe public config - decoupled in foundation phase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

# Gemini AI (Server-only secret: NEVER prefix with NEXT_PUBLIC)
GEMINI_API_KEY=your-gemini-api-key
```

*Note: For local development, the application functions with mock responses even if Supabase or Gemini keys are not yet configured.*

---

## 9. Compliance & Regulatory Disclaimers

- TaxAIHelp is an independent educational tool.
- TaxAIHelp is **not affiliated with, endorsed by, or approved by the Internal Revenue Service (IRS)**.
- Calculations are deterministic estimates for planning and educational purposes.
- We never guarantee tax refunds or specific tax outcomes.
- Taxpayers should always verify important tax filings with a licensed CPA or Enrolled Agent.
