# Tax Engine Specification & Tax Source Registry

**Engine Version:** `1.1.0-production-baseline`  
**Precision Standard:** Integer Cents (1 Dollar = 100 Cents)  
**Supported Tax Years:** 2026, 2025, 2024, 2023  
**Default Tax Year:** 2025  

---

## 1. Mathematical Standards

1. **Precision Rule:** All currency inputs, intermediate computations, progressive bracket accumulators, and outputs are strictly integer cents.
   - Conversion Formula: `Cents = Math.round(Dollars * 100)`
2. **Deterministic Rounding:** Rounding occurs deterministically at statutory intermediate boundaries (e.g., Schedule SE 92.35% net profit factor, 12.4% OASDI, 2.9% Medicare) using `Math.round`.
3. **Zero Floating-Point Drift:** No progressive bracket accumulation or liability aggregation is ever performed with raw IEEE 754 floating-point decimals.
4. **Engine Versioning:** Every computation returns:
   - `engineVersion`: `1.1.0-production-baseline`
   - `rulesVersion`: The exact official citation of the statutory ruleset applied (e.g., `IRS-REV-PROC-2024-40`).

---

## 2. Tax Source Registry

Every tax constant, rate, and threshold in TaxAIHelp is mapped to an authoritative, official government source:

| Tax Year | Status | IRS / Federal Source | Official Documentation Title / Public Law | Implementation File | Test Coverage File |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2026** | **Target Baseline** | IRS Rev. Proc. 2025-32 & SSA 2026 Announcement | *2026 Inflation Adjustments under P.L. 119-21 (OBBBA permanent TCJA individual rate brackets)* | [`tax-engine/rules/2026/index.ts`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2026/index.ts) | [`tax-engine/tests/income-tax-2026.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/income-tax-2026.test.ts), [`tax-engine/tests/self-employment-2026.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/self-employment-2026.test.ts) |
| **2025** | **Production Default** | IRS IRB 2025-45, P.L. 119-21 (OBBBA) & SSA 2025 Announcement | *Internal Revenue Bulletin 2025-45 modifying standard deductions under One Big Beautiful Bill Act (OBBBA); brackets per Rev. Proc. 2024-40 § 3.01* | [`tax-engine/rules/2025/index.ts`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2025/index.ts) | [`tax-engine/tests/income-tax-2025.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/income-tax-2025.test.ts), [`tax-engine/tests/self-employment-2025.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/self-employment-2025.test.ts) |
| **2024** | **Historical Baseline** | IRS Rev. Proc. 2023-34 & SSA 2024 Announcement | *Internal Revenue Bulletin: 2023-48, Revenue Procedure 2023-34 (Nov 9, 2023)* | [`tax-engine/rules/2024/index.ts`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2024/index.ts) | [`tests/tax-engine.test.ts`](file:///e:/USA%20TAX%20Project/tests/tax-engine.test.ts) |
| **2023** | **Historical Baseline** | IRS Rev. Proc. 2022-38 & SSA 2023 Announcement | *Internal Revenue Bulletin: 2022-45, Revenue Procedure 2022-38 (Oct 18, 2022)* | [`tax-engine/rules/2023/index.ts`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2023/index.ts) | [`tests/tax-engine.test.ts`](file:///e:/USA%20TAX%20Project/tests/tax-engine.test.ts) |

---

## 3. Standard Deductions (IRC § 63(c))

The engine strictly implements the statutory Standard Deduction as the verified baseline. All values stored in integer cents. The original Rev. Proc. 2024-40 standard deduction values ($15,000 / $30,000 / $22,500) were modified and superseded for Tax Year 2025 by P.L. 119-21 (OBBBA) as announced in IRS Internal Revenue Bulletin 2025-45:

| Filing Status | Tax Year 2026 (cents / $) | Tax Year 2025 (cents / $) | Tax Year 2024 (cents / $) | Tax Year 2023 (cents / $) |
| :--- | :--- | :--- | :--- | :--- |
| **Single** | 1,610,000 ($16,100) | 1,575,000 ($15,750) | 1,460,000 ($14,600) | 1,385,000 ($13,850) |
| **Married Filing Jointly (MFJ)** | 3,220,000 ($32,200) | 3,150,000 ($31,500) | 2,920,000 ($29,200) | 2,770,000 ($27,700) |
| **Married Filing Separately (MFS)** | 1,610,000 ($16,100) | 1,575,000 ($15,750) | 1,460,000 ($14,600) | 1,385,000 ($13,850) |
| **Head of Household (HoH)** | 2,415,000 ($24,150) | 2,362,500 ($23,625) | 2,190,000 ($21,900) | 2,080,000 ($20,800) |
| **Qualifying Surviving Spouse (QSS)**| 3,220,000 ($32,200) | 3,150,000 ($31,500) | 2,920,000 ($29,200) | 2,770,000 ($27,700) |

---

## 4. Ordinary Federal Income Tax Brackets (IRC § 1)

### Tax Year 2025 (IRS Rev. Proc. 2024-40, § 3.01)

- **Single:**
  - 10%: $0 to $11,925 (0 to 1,192,500¢)
  - 12%: $11,925 to $48,475 (1,192,500¢ to 4,847,500¢)
  - 22%: $48,475 to $103,350 (4,847,500¢ to 10,335,000¢)
  - 24%: $103,350 to $197,300 (10,335,000¢ to 19,730,000¢)
  - 32%: $197,300 to $250,525 (19,730,000¢ to 25,052,500¢)
  - 35%: $250,525 to $626,350 (25,052,500¢ to 62,635,000¢)
  - 37%: Over $626,350 (62,635,000¢+)
- **Married Filing Jointly:**
  - 10%: $0 to $23,850 (0 to 2,385,000¢)
  - 12%: $23,850 to $96,950 (2,385,000¢ to 9,695,000¢)
  - 22%: $96,950 to $206,700 (9,695,000¢ to 20,670,000¢)
  - 24%: $206,700 to $394,600 (20,670,000¢ to 39,460,000¢)
  - 32%: $394,600 to $501,050 (39,460,000¢ to 50,105,000¢)
  - 35%: $501,050 to $751,600 (50,105,000¢ to 75,160,000¢)
  - 37%: Over $751,600 (75,160,000¢+)
- **Head of Household:**
  - 10%: $0 to $17,000 (0 to 1,700,000¢)
  - 12%: $17,000 to $64,850 (1,700,000¢ to 6,485,000¢)
  - 22%: $64,850 to $103,350 (6,485,000¢ to 10,335,000¢)
  - 24%: $103,350 to $197,300 (10,335,000¢ to 19,730,000¢)
  - 32%: $197,300 to $250,500 (19,730,000¢ to 25,050,000¢)
  - 35%: $250,500 to $626,350 (25,050,000¢ to 62,635,000¢)
  - 37%: Over $626,350 (62,635,000¢+)

### Tax Year 2026 (IRS Rev. Proc. 2025-32, P.L. 119-21 OBBBA)

- **Single:**
  - 10%: $0 to $12,400 (0 to 1,240,000¢)
  - 12%: $12,400 to $50,400 (1,240,000¢ to 5,040,000¢)
  - 22%: $50,400 to $107,500 (5,040,000¢ to 10,750,000¢)
  - 24%: $107,500 to $205,200 (10,750,000¢ to 20,520,000¢)
  - 32%: $205,200 to $260,550 (20,520,000¢ to 26,055,000¢)
  - 35%: $260,550 to $651,400 (26,055,000¢ to 65,140,000¢)
  - 37%: Over $651,400 (65,140,000¢+)
- **Married Filing Jointly:**
  - 10%: $0 to $24,800 (0 to 2,480,000¢)
  - 12%: $24,800 to $100,800 (2,480,000¢ to 10,080,000¢)
  - 22%: $100,800 to $215,000 (10,080,000¢ to 21,500,000¢)
  - 24%: $215,000 to $410,400 (21,500,000¢ to 41,040,000¢)
  - 32%: $410,400 to $521,100 (41,040,000¢ to 52,110,000¢)
  - 35%: $521,100 to $781,700 (52,110,000¢ to 78,170,000¢)
  - 37%: Over $781,700 (78,170,000¢+)
- **Head of Household:**
  - 10%: $0 to $17,700 (0 to 1,770,000¢)
  - 12%: $17,700 to $67,450 (1,770,000¢ to 6,745,000¢)
  - 22%: $67,450 to $107,500 (6,745,000¢ to 10,750,000¢)
  - 24%: $107,500 to $205,200 (10,750,000¢ to 20,520,000¢)
  - 32%: $205,200 to $260,500 (20,520,000¢ to 26,050,000¢)
  - 35%: $260,500 to $651,400 (26,050,000¢ to 65,140,000¢)
  - 37%: Over $651,400 (65,140,000¢+)

---

## 5. Self-Employment Tax (IRC § 1401 & 1402 / Schedule SE)

### Statutory Formula

1. **Net Business Profit:**  
   $$\text{NetSEProfit} = \max(0, \text{Gross1099} - \text{BusinessExpenses})$$
2. **De Minimis Exception (IRC § 1402(b)):**  
   If $\text{NetSEProfit} < 40,000\text{ cents } (\$400)$, $\text{SETax} = 0$.
3. **Statutory Net Earnings Factor (IRC § 1402(a)(12)):**  
   $$\text{TaxableSEProfit} = \text{round}(\text{NetSEProfit} \times 0.9235)$$
4. **Social Security (OASDI) Wage Base Cap:**
   - **2026:** $184,500 (18,450,000 cents) — SSA 2026 Announcement
   - **2025:** $176,100 (17,610,000 cents) — SSA 2025 Announcement
   - **2024:** $168,600 (16,860,000 cents) — SSA 2024 Announcement
   - **2023:** $160,200 (16,020,000 cents) — SSA 2023 Announcement
5. **Wage Base Offsetting:**  
   W-2 wages reduce the remaining OASDI wage base available to self-employment income:  
   $$\text{RemainingOASDICap} = \max(0, \text{SocialSecurityCap} - \text{W2Wages})$$  
   $$\text{TaxableOASDIIncome} = \min(\text{TaxableSEProfit}, \text{RemainingOASDICap})$$
6. **OASDI Tax (12.4%):**  
   $$\text{SocialSecurityTax} = \text{round}(\text{TaxableOASDIIncome} \times 0.124)$$
7. **Medicare Tax (2.9% uncapped):**  
   $$\text{MedicareTax} = \text{round}(\text{TaxableSEProfit} \times 0.029)$$
8. **Total SE Tax:**  
   $$\text{TotalSETax} = \text{SocialSecurityTax} + \text{MedicareTax}$$
9. **Deductible Half of SE Tax (IRC § 164(f)):**  
   $$\text{DeductibleHalf} = \text{round}(\text{TotalSETax} \times 0.50)$$  
   This deductible half is deducted above-the-line from Gross Total Income to calculate Adjusted Gross Income (AGI).

---

## 6. Quarterly Estimated Tax (IRC § 6654 / Form 1040-ES)

1. **Annual Net Liability:**  
   $$\text{AnnualLiability} = \text{FederalIncomeTax} + \text{SelfEmploymentTax}$$
2. **Annual Net Due After Withholding:**  
   $$\text{NetAnnualDue} = \max(0, \text{AnnualLiability} - \text{FederalWithholding})$$
3. **Equal Quarterly Installments:**  
   Installment payment per voucher:  
   $$\text{QuarterlyInstallment} = \text{round}\left(\frac{\text{NetAnnualDue}}{4}\right)$$
4. **Vouchers:** Four statutory IRS payment milestones (April 15, June 15, September 15, January 15).

---

## 7. Supported vs Unsupported Scope

### Supported Baseline Features
- Form 1040 W-2 ordinary wages
- 1099-NEC / 1099-MISC / Schedule C gross business revenues
- Documented ordinary business expenses
- Statutory standard deduction (Single, MFJ, MFS, HoH, QSS)
- Deductible half of self-employment tax (above-the-line adjustment)
- Seven-bracket federal progressive income tax
- Uncapped Medicare & capped OASDI self-employment tax
- Form 1040-ES quarterly estimated tax breakdown

### Unsupported Features & Structured Warning Codes
When unsupported inputs are submitted to the engine via API or engine payloads, the engine does **not** hallucinate calculations. Instead, it emits structured, non-fatal warnings:
- `ITEMIZED_DEDUCTIONS_UNSUPPORTED`: Itemized deductions (Schedule A) are not part of the core baseline; standard deduction is automatically substituted.
- `STATE_TAX_UNSUPPORTED`: State and local taxes are not included; user is advised that federal results only are produced.
- `CREDITS_UNSUPPORTED`: Non-refundable and refundable credits (CTC, EITC, EV credit, education credits) are excluded from the current baseline.
- `QBI_UNSUPPORTED`: Qualified Business Income (IRC § 199A) deduction is not applied.
- `ADDITIONAL_MEDICARE_TAX_UNSUPPORTED`: Form 8959 0.9% additional Medicare tax on high earners is not modeled in the current baseline.
