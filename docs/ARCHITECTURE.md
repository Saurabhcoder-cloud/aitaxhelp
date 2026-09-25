# TaxAIHelp System Architecture

**Domain:** [taxaihelp.com](https://taxaihelp.com)  
**Tagline:** “Smarter Tax Help, Powered by AI”  
**Target Market:** United States  
**Engine Version:** `1.1.0-production-baseline`  
**Primary Tax Year:** 2025 (Default)  
**Supported Tax Years:** 2026, 2025, 2024, 2023  

---

## 1. Architectural Philosophy & Hard Boundaries

TaxAIHelp is engineered around one foundational invariant:

```
UI (Client Component Forms / Assistant Chat)
  ↓
API / Application Layer (Next.js App Router Route Handlers)
  ↓
Validation (Zod Strict Schemas)
  ↓
Deterministic Tax Engine (Pure Functional Integer-Cents Math)
  ↓
Structured Result (with Versioned Engine & Rules Metadata + Warnings)
  ↓
UI Presentation (Verified Numbers & Educational Breakdowns)
```

### The AI Authority Boundary
```
User Prompt
  ↓
Gemini Natural Language Processing (lib/ai/gemini)
  ↓
Structured Intent & Parameter Extraction
  ↓
Zod Validation (Schema Guards)
  ↓
Deterministic Tax Engine (tax-engine/)
  ↓
Verified Calculation Result (Single Source of Truth)
  ↓
Gemini Educational Translation / Explanation
  ↓
UI Presentation (Verified numbers + Breakdown)
```

**Under NO circumstance does Gemini or any LLM perform numeric calculations directly.** LLMs are probabilistic language engines; tax calculations must be 100% deterministic and reproducible to the exact integer cent.

---

## 2. Directory Structure

```
e:\USA TAX Project\
├── app/                              # Next.js 14 App Router
│   ├── (marketing)/                  # Marketing and informational pages
│   │   ├── about/                    # About TaxAIHelp mission & philosophy
│   │   ├── contact/                  # Contact & support intake
│   │   ├── pricing/                  # Transparent plan overview
│   │   ├── faq/                      # Comprehensive taxpayer Q&A
│   │   ├── privacy/                  # Privacy policy (no selling of data)
│   │   ├── terms/                    # Terms of service & liability limits
│   │   ├── disclaimer/               # Legal & regulatory disclosures
│   │   ├── tax-resources/            # Educational tax articles & guides
│   │   └── tax-professionals/        # Licensed CPA/EA matchmaking directory
│   ├── tax-calculators/              # Interactive federal calculators
│   │   ├── page.tsx                  # Calculators Hub
│   │   ├── income-tax/               # Form 1040 W-2 Income Tax
│   │   ├── self-employed/            # Schedule SE Self-Employment Tax
│   │   ├── 1099/                     # 1099 Freelancer Contractor Tax
│   │   └── quarterly-tax/            # Form 1040-ES Quarterly Estimates
│   ├── ai-tax-assistant/             # Dedicated conversational AI workspace
│   ├── dashboard/                    # Taxpayer workspace (Overview, Saved, Conversations, Settings)
│   ├── api/v1/                       # Backend API route handlers
│   │   ├── tax/calculate/            # Deterministic calculation endpoint
│   │   ├── ai/assistant/             # AI intent & explanation pipeline endpoint
│   │   ├── leads/                    # CPA/EA matchmaking lead intake
│   │   └── health/                   # System health & engine version status
│   ├── layout.tsx                    # Root layout with Header, Footer, and Fonts
│   ├── page.tsx                      # Production-grade Homepage
│   ├── globals.css                   # Tailwind base directives and variables
│   ├── loading.tsx                   # Accessible root loading state
│   ├── error.tsx                     # Sanitized error boundary
│   ├── not-found.tsx                 # 404 handler
│   ├── global-error.tsx              # Global fatal error boundary
│   ├── robots.ts                     # Crawler rules
│   └── sitemap.ts                    # Dynamic XML sitemap
├── components/                       # Modular UI & Layout Component Library
│   ├── ui/                           # Button, Card, Input, Select, FormField, Alert, Badge, etc.
│   ├── layout/                       # Header, MobileNav, Footer, DashboardNav
│   ├── home/                         # Modular Homepage sections (Hero, Showcase, AI, etc.)
│   ├── calculators/                  # Interactive form components bound to tax-engine
│   └── shared/                       # Legal notices, FAQ accordion
├── lib/                              # Core Utilities, SEO, AI, and Supabase wrappers
│   ├── ai/gemini/                    # Server-only Gemini client, config, prompts, schemas, service
│   ├── supabase/                     # Safe browser/server client stubs and config
│   ├── utils/                        # Integer-cents currency math, Tailwind cn, safe errors
│   ├── seo/                          # Metadata builders, OpenGraph, Twitter cards
│   └── constants/                    # Navigation, IRS deadlines, route maps
├── tax-engine/                       # Isolated Deterministic Calculation Engine
│   ├── index.ts                      # Master engine exports
│   ├── types.ts                      # Rule tables and calculation contracts
│   ├── rules/                        # Official IRS Rulesets (Immutable)
│   │   ├── 2026/index.ts             # IRS Rev. Proc. 2025-32 & SSA 2026 ($184,500 cap)
│   │   ├── 2025/index.ts             # IRS IRB 2025-45 / OBBBA & SSA 2025 ($176,100 cap)
│   │   ├── 2024/index.ts             # IRS Rev. Proc. 2023-34 & SSA 2024 ($168,600 cap)
│   │   ├── 2023/index.ts             # IRS Rev. Proc. 2022-38 & SSA 2023 ($160,200 cap)
│   │   ├── base-rules.ts             # Backward-compatible rules forwarder
│   │   └── index.ts                  # Rules registry & lookup engine
│   ├── calculations/                 # Pure calculations (deductions, income tax, Schedule SE, quarterly)
│   ├── validation/                   # Zod schemas for all tax inputs
│   └── tests/                        # Vitest unit & boundary test suites
├── types/                            # Global TypeScript contracts (tax, ai, supabase, nav)
├── supabase/                         # Database blueprint
│   ├── schema.sql                    # PostgreSQL tables, RLS policies, and indexes
│   └── README.md                     # Migration documentation
├── docs/                             # Engineering, architecture specifications, and AI governance
└── tests/                            # Top-level API and integration test suites
```

---

## 3. Data Integrity & Financial Precision

1. **Integer Cents (`Cents: number`):** All mathematical calculations operate strictly in integer cents (e.g. `$100.50` is stored and computed as `10050`). No floating-point roundoff occurs in calculations.
2. **Deterministic Engine:** Running the exact same input through the engine will always produce the exact same output.
3. **Structured Warnings:** When tax scenarios touch unsupported frontiers (such as state taxes or itemized deductions), structured `TaxWarning` objects are appended to the calculation response.
4. **UI-Engine Alignment:** The UI never advertises features that the engine does not support. The forms explicitly model the Standard Deduction and clearly disclose this limitation.

---

## 4. Security & Privacy Safeguards

- **Zero Secret Leakage:** `handleApiError` strips all stack traces and database internal details.
- **Server-Only AI Boundary:** `GEMINI_API_KEY` is never prefixed with `NEXT_PUBLIC_` and cannot be accessed by client bundles.
- **No Service-Role Key on Client:** Supabase client wrappers are strictly limited to publishable keys and authenticated user sessions governed by Row Level Security (RLS).
- **No Live Database Requirement:** The system operates fully in an offline/decoupled mode for all tax calculations.
