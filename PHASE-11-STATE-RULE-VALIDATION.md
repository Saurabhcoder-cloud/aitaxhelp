# Phase 11 — State Tax Rule Validation Report
**Document Version:** 1.0.0  
**Status:** Statutory Rule Baseline Verified  
**System:** TaxAIHelp (USA Tax Preparation Platform)  
**Date:** October 3, 2026

---

## 1. Statutory Rule Basis & Governance

TaxAIHelp adheres to an uncompromised architectural principle:
> **Zero Guessing Invariant**: Never estimate, guess, or synthesize state tax rules. Every implemented state tax computation must be backed by authoritative statutory references (e.g., California Revenue and Taxation Code), official Department of Revenue tax rate schedules, and deterministic unit/integration test coverage.

States lacking verified statutory rules are deterministically maintained in the `NOT_SUPPORTED` registry tier.

---

## 2. California Statutory Rule Validation (Tax Years 2025 & 2026)

### 2.1 State Overview
- **State**: California (CA)
- **Revenue Authority**: State of California Franchise Tax Board (FTB)
- **Primary Statutory Authority**: California Revenue and Taxation Code (RTC)
- **Primary Individual Tax Returns**:
  - California Form 540 (*California Resident Income Tax Return*)
  - California Form 540NR (*California Nonresident or Part-Year Resident Income Tax Return*)
  - Schedule CA (540 / 540NR) (*California Adjustments*)
- **Implementation Files**:
  - [`lib/state-tax/rules/ca/types.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/rules/ca/types.ts)
  - [`lib/state-tax/rules/ca/2025.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/rules/ca/2025.ts)
  - [`lib/state-tax/rules/ca/2026.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/rules/ca/2026.ts)
  - [`lib/state-tax/rules/ca/index.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/rules/ca/index.ts)
  - [`lib/state-tax/engines/california-engine.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/engines/california-engine.ts)
- **Test Coverage**:
  - [`tests/state/ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (16 dedicated tests)
  - [`tests/phase11-state-tax-engines.test.ts`](file:///e:/USA%20TAX%20Project/tests/phase11-state-tax-engines.test.ts) (30 end-to-end scenarios)

---

### 2.2 Statutory Matrix & Citations

| Tax Element | Governing Statute / Source | Tax Year 2025 Rule Value | Tax Year 2026 Rule Value (Indexed) | Test Verification |
|---|---|---|---|---|
| **Tax Rates & Brackets** | California RTC § 17041(a), (b), (c) | 9 Progressive Brackets:<br>• 1.0% ($0 - $10,756)<br>• 2.0% ($10,756 - $25,499)<br>• 4.0% ($25,499 - $40,245)<br>• 6.0% ($40,245 - $55,803)<br>• 8.0% ($55,803 - $70,542)<br>• 9.3% ($70,542 - $360,659)<br>• 10.3% ($360,659 - $432,790)<br>• 11.3% ($432,790 - $721,314)<br>• 12.3% ($721,314+) | Indexed by CCPI factor (~2.5%):<br>• 1.0% ($0 - $11,025)<br>• 2.0% ($11,025 - $26,136)<br>• 4.0% ($26,136 - $41,251)<br>• 6.0% ($41,251 - $57,198)<br>• 8.0% ($57,198 - $72,306)<br>• 9.3% ($72,306 - $369,675)<br>• 10.3% ($369,675 - $443,610)<br>• 11.3% ($443,610 - $739,347)<br>• 12.3% ($739,347+) | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Tests 4, 5, 6, 7) |
| **Mental Health Services Tax** | Proposition 63; RTC § 17043 | 1.0% surtax on California taxable income exceeding $1,000,000 ($100,000,000 cents). Unindexed by statute. Top marginal rate reaches 13.3%. | 1.0% surtax on California taxable income exceeding $1,000,000. Unindexed by statute. | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Test 8) |
| **Standard Deduction** | California RTC § 17073.5 | • Single / MFS: $5,540 ($554,000 cents)<br>• MFJ / HOH / QSS: $11,080 ($1,108,000 cents) | • Single / MFS: $5,680 ($568,000 cents)<br>• MFJ / HOH / QSS: $11,360 ($1,136,000 cents) | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Tests 1, 2) |
| **Personal Exemption Credit** | California RTC § 17054(a), (b) | • Single / MFS / HOH: $149 ($14,900 cents)<br>• MFJ / QSS: $298 ($29,800 cents) | • Single / MFS / HOH: $153 ($15,300 cents)<br>• MFJ / QSS: $306 ($30,600 cents) | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Tests 9, 10) |
| **Dependent Exemption Credit** | California RTC § 17054(d) | $456 ($45,600 cents) per qualifying dependent child or other dependent. | $468 ($46,800 cents) per qualifying dependent child or other dependent. | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Tests 9, 10) |
| **Exemption Credit Phaseout** | California RTC § 17054(f) | Phaseout threshold begins at:<br>• Single: $249,261<br>• MFJ: $498,527<br>• HOH: $373,896<br>Reduces credit by $6 per $2,500 increment above threshold. | Phaseout threshold begins at:<br>• Single: $255,493<br>• MFJ: $510,990<br>• HOH: $383,243 | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Test 10) |
| **California EITC (CalEITC)** | California RTC § 17052 | Refundable credit for earned income up to $31,550. Max credits:<br>• 0 children: $300<br>• 1 child: $2,000<br>• 2 children: $3,310<br>• 3+ children: $3,730 | Refundable credit for earned income up to $32,339. Max credits:<br>• 0 children: $308<br>• 1 child: $2,050<br>• 2 children: $3,393<br>• 3+ children: $3,823 | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Tests 11, 12) |
| **Young Child Tax Credit (YCTC)** | California RTC § 17052.1 | $1,117 refundable credit for families qualifying for CalEITC with an eligible child under 6. | $1,145 refundable credit for families qualifying for CalEITC with an eligible child under 6. | [`ca-rules.test.ts`](file:///e:/USA%20TAX%20Project/tests/state/ca-rules.test.ts) (Tests 13, 14) |
| **Nonresident / Part-Year Proration** | California RTC § 17041(i); Form 540NR Schedule CA | Worldwide tax computed, then prorated by: `California Source Income / Worldwide AGI`. Exemption credits prorated accordingly. | Worldwide tax computed, then prorated by California sourcing ratio. | [`phase11-state-tax-engines.test.ts`](file:///e:/USA%20TAX%20Project/tests/phase11-state-tax-engines.test.ts) (Tests 6, 7) |

---

## 3. Statutory No-Tax States Validation (9 States)

| State | Statutory Basis | Filing Obligation | Implemented Treatment |
|---|---|---|---|
| **Alaska (AK)** | Alaska Statutes § 43.05 | No individual personal income tax. | Zero tax liability. 100% refund of any errant withholding. |
| **Florida (FL)** | Florida Constitution Art. VII, § 5 | No individual personal income tax. | Zero tax liability. 100% refund of withholding. |
| **Nevada (NV)** | Nevada Constitution Art. 10, § 1 | No personal income tax. | Zero tax liability. |
| **New Hampshire (NH)** | NH Rev. Stat. Ann. § 77 (Interest and Dividends tax phases out fully by 2027) | No tax on individual wage or earned compensation. | Zero wage tax liability. |
| **South Dakota (SD)** | South Dakota Constitution Art. XI, § 2 | No individual income tax. | Zero tax liability. |
| **Tennessee (TN)** | Tennessee Constitution Art. II, § 28 | Hall Income Tax repealed; no wage income tax. | Zero tax liability. |
| **Texas (TX)** | Texas Constitution Art. VIII, § 24-a | Prohibits personal income tax without constitutional amendment. | Zero tax liability. |
| **Washington (WA)** | Washington Constitution Art. VII, § 1 (Capital Gains Tax is an excise tax on high gains) | No personal wage income tax. | Zero wage tax liability. |
| **Wyoming (WY)** | Wyoming Constitution Art. 15 | No individual personal income tax. | Zero tax liability. |

---

## 4. Unsupported States Governance & Blockers

All remaining 40 states + DC are cataloged in `lib/state-tax/registry.ts` with `supportStatus: "NOT_SUPPORTED"` and `supportTier: "NOT_SUPPORTED"`:
- **Blocker**: Certified state engine implementations require tax year statutory rates, local county piggyback taxes (e.g., Maryland county taxes, Ohio local income taxes, Indiana county rates), state-specific retirement subtractions, and official filing schedules.
- **Safety Guarantee**: The platform will never estimate or guess tax rules for unsupported states. Any calculation attempt returns HTTP 422 `STATE_NOT_SUPPORTED` and a blocking readiness check directing the filer to the state revenue department.
