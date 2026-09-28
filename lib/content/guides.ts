import { TaxGuide } from "./types";

export const TAX_GUIDES: TaxGuide[] = [
  {
    slug: "how-federal-income-tax-works",
    title: "How Federal Income Tax Works: Progressive Brackets & Taxable Income",
    description:
      "A complete educational guide to how US progressive federal income tax brackets, marginal rates, standard deductions, and taxable income are calculated.",
    publishedAt: "2025-10-15T09:00:00Z",
    updatedAt: "2025-11-20T10:00:00Z",
    taxYear: 2025,
    category: "Federal Taxes",
    author: "TaxAIHelp Tax Research Group",
    readingTime: "7 min read",
    seoTitle: "How Federal Income Tax Works: Progressive Brackets Explained",
    seoDescription:
      "Understand progressive federal income tax brackets, standard deduction subtraction, and marginal vs effective tax rates for 2025 and 2026.",
    canonicalUrl: "https://taxaihelp.com/tax-guides/how-federal-income-tax-works",
    schemaType: "Article",
    statutorySources: [
      "IRC § 1: Tax Imposed on Individuals",
      "IRS IRB 2025-45 / P.L. 119-21 (One Big Beautiful Bill Act)",
      "IRS Revenue Procedure 2025-32",
    ],
    keyTakeaways: [
      "The US uses a progressive tax bracket system: higher tax rates only apply to dollars within that specific bracket.",
      "Your standard deduction is subtracted from gross income before bracket calculations begin.",
      "Your effective tax rate is always lower than your top marginal bracket rate.",
    ],
    sections: [
      {
        heading: "1. Gross Income to Taxable Income",
        content:
          "Federal income tax is not assessed on your total gross pay. Instead, you subtract allowable adjustments (such as the educator expense or one-half of self-employment tax) to determine Adjusted Gross Income (AGI). Next, you subtract either the standard deduction ($15,750 for Single / $31,500 for MFJ in 2025; $16,100 / $32,200 in 2026) or itemized deductions to arrive at your Taxable Income.",
      },
      {
        heading: "2. The Progressive Bracket Staircase",
        content:
          "The federal tax code employs seven marginal brackets: 10%, 12%, 22%, 24%, 32%, 35%, and 37%. Income is taxed in progressive slices. For example, for a Single filer in 2025, the first $11,925 of taxable income is taxed at 10%. Only dollars between $11,925 and $48,475 are taxed at 12%, and so forth. Entering a higher bracket never causes your entire income to be taxed at the higher rate.",
      },
      {
        heading: "3. Withholding, Credits, and Balance Due",
        content:
          "Once tentative tax is calculated across the brackets, nonrefundable credits (such as the child tax credit or education credits) reduce the tax dollar-for-dollar. Finally, total federal income tax withheld from your paychecks (Form W-2 Box 2) is subtracted. If withholding exceeds your tax liability, you receive a refund; if it is less, you owe a balance.",
      },
    ],
    relatedCalculators: [
      {
        name: "Federal Income Tax Calculator",
        href: "/tax-calculators/income-tax",
        description: "Calculate your tax across all 7 progressive brackets with standard deduction.",
      },
      {
        name: "2025 Income Tax Calculator",
        href: "/tax-calculators/2025-federal-income-tax-calculator",
        description: "View verified 2025 bracket thresholds and standard deductions.",
      },
      {
        name: "2026 Income Tax Calculator",
        href: "/tax-calculators/2026-federal-income-tax-calculator",
        description: "View verified 2026 bracket thresholds under Rev. Proc. 2025-32.",
      },
    ],
    relatedGuides: [
      "marginal-vs-effective-tax-rate-explained",
      "standard-deduction-vs-itemized-deductions",
    ],
    faqs: [
      {
        question: "Does getting a raise ever reduce my take-home pay due to a higher tax bracket?",
        answer:
          "No. Because the US tax system is strictly marginal, only the additional dollars above the bracket threshold are taxed at the higher rate. Every previous dollar remains taxed at its lower rate.",
      },
      {
        question: "Is this guide a substitute for a licensed CPA or tax attorney?",
        answer:
          "No. This guide is provided strictly for educational purposes. For formal tax preparation, complex deductions, or audit representation, consult a licensed CPA or Enrolled Agent.",
      },
    ],
  },
  {
    slug: "how-self-employment-tax-works",
    title: "How Self-Employment Tax Works: Schedule SE, FICA & Above-the-Line Deductions",
    description:
      "A complete guide to self-employment tax: the 15.3% rate, Social Security wage cap, the 92.35% statutory net profit factor, and above-the-line deduction.",
    publishedAt: "2025-10-18T10:00:00Z",
    updatedAt: "2025-11-22T12:00:00Z",
    taxYear: 2025,
    category: "Self-Employment Taxes",
    author: "TaxAIHelp Tax Research Group",
    readingTime: "6 min read",
    seoTitle: "How Self-Employment Tax Works: Schedule SE & 15.3% FICA Breakdown",
    seoDescription:
      "Learn how Schedule SE self-employment tax is computed using the statutory 92.35% multiplier, 12.4% Social Security cap, and 2.9% Medicare tax.",
    canonicalUrl: "https://taxaihelp.com/tax-guides/how-self-employment-tax-works",
    schemaType: "Article",
    statutorySources: [
      "IRC § 1401: Rate of Self-Employment Tax",
      "IRC § 1402: Definitions of Net Earnings from Self-Employment",
      "IRS Schedule SE (Form 1040) Instructions",
      "SSA Fact Sheet: 2025 & 2026 Social Security Contribution Base",
    ],
    keyTakeaways: [
      "Self-employment tax represents both employer and employee halves of FICA (12.4% Social Security + 2.9% Medicare = 15.3%).",
      "The tax applies to 92.35% of your net business profit, not 100%.",
      "You receive an above-the-line deduction on Schedule 1 for exactly 50% of the self-employment tax you pay.",
    ],
    sections: [
      {
        heading: "1. The Anatomy of the 15.3% Self-Employment Rate",
        content:
          "When you are an employee, your employer pays 7.65% in FICA taxes and withholds 7.65% from your paycheck. When you are self-employed (as a freelancer, sole proprietor, or partner), you are both employer and employee. Therefore, you pay the full 15.3% rate: 12.4% for Old-Age, Survivors, and Disability Insurance (Social Security) and 2.9% for Hospital Insurance (Medicare).",
      },
      {
        heading: "2. The Statutory 92.35% Net Profit Multiplier",
        content:
          "IRC § 1402(a)(12) provides a mathematical parity adjustment: you multiply your net profit by 92.35% (0.9235) before calculating SE tax. This prevents you from paying self-employment tax on the employer portion of the tax itself.",
      },
      {
        heading: "3. Social Security Wage Base Limits",
        content:
          "The 12.4% Social Security portion only applies up to the statutory annual ceiling: $176,100 in 2025 and $184,500 in 2026. If you have concurrent W-2 earnings, those wages count first toward the ceiling, reducing the amount of self-employment earnings subject to Social Security tax. The 2.9% Medicare portion continues on all net earnings without any ceiling.",
      },
    ],
    relatedCalculators: [
      {
        name: "Self-Employed Tax Calculator",
        href: "/tax-calculators/self-employed",
        description: "Compute Schedule SE self-employment tax and above-the-line deduction.",
      },
      {
        name: "1099 Contractor Tax Calculator",
        href: "/tax-calculators/1099",
        description: "Calculate contractor earnings with deductible business expenses.",
      },
      {
        name: "Quarterly Tax Calculator",
        href: "/tax-calculators/quarterly-tax",
        description: "Plan quarterly installments for self-employment tax liabilities.",
      },
    ],
    relatedGuides: [
      "1099-contractor-tax-basics",
      "quarterly-estimated-tax-guide",
    ],
    faqs: [
      {
        question: "Can I deduct health insurance if I am self-employed?",
        answer:
          "Yes. Self-employed individuals may generally claim the self-employed health insurance deduction on Schedule 1 as an above-the-line adjustment, provided they were not eligible to participate in an employer-sponsored health plan.",
      },
      {
        question: "Does the 50% deduction lower my self-employment tax?",
        answer:
          "No. The 50% deduction reduces your Adjusted Gross Income (AGI), which lowers your federal income tax, but does not reduce the Schedule SE self-employment tax itself.",
      },
    ],
  },
  {
    slug: "1099-contractor-tax-basics",
    title: "1099 Contractor Tax Basics: Forms, Deductions & Write-Offs",
    description:
      "Everything independent contractors, gig workers, and consultants need to know about Form 1099-NEC, Schedule C deductions, and quarterly obligations.",
    publishedAt: "2025-10-22T11:00:00Z",
    updatedAt: "2025-11-25T15:00:00Z",
    taxYear: 2025,
    category: "1099 Taxes",
    author: "TaxAIHelp Tax Research Group",
    readingTime: "6 min read",
    seoTitle: "1099 Contractor Tax Basics: Deductions, Forms & Write-Offs Guide",
    seoDescription:
      "A complete guide to 1099-NEC contractor taxes, Schedule C deductible business expenses, record keeping, and estimated tax budgeting.",
    canonicalUrl: "https://taxaihelp.com/tax-guides/1099-contractor-tax-basics",
    schemaType: "Article",
    statutorySources: [
      "IRC § 162: Trade or Business Expenses",
      "IRS Instructions for Form 1099-NEC & Form 1099-K",
      "IRS Schedule C (Form 1040) Profit or Loss From Business",
    ],
    keyTakeaways: [
      "Form 1099-NEC reports nonemployee gross compensation; no income or payroll taxes are withheld at source.",
      "Legitimate ordinary and necessary business expenses reduce your taxable net profit on Schedule C.",
      "Contractors must proactively budget 25% to 35% of net profit for combined income and SE taxes.",
    ],
    sections: [
      {
        heading: "1. Understanding Form 1099-NEC and 1099-K",
        content:
          "Businesses issue Form 1099-NEC to non-corporate independent service providers paid $600 or more during the calendar year. Third-party payment settlement organizations (like Stripe, PayPal, or Venmo) issue Form 1099-K. Even if you do not receive a form, the IRS requires reporting all business receipts on Schedule C.",
      },
      {
        heading: "2. Allowable Schedule C Business Deductions",
        content:
          "Under IRC § 162, you can deduct expenses that are 'ordinary' (common and accepted in your trade) and 'necessary' (helpful and appropriate for your business). Common allowable categories include professional software subscriptions, advertising, business insurance, specialized tools, home office deductions (using simplified or actual expense methods), and documented business mileage.",
      },
      {
        heading: "3. Maintaining Substantive Audit-Ready Records",
        content:
          "The burden of proof for business deductions rests on the taxpayer. Maintain segregated business banking accounts, digital receipts, itemized invoices, and mileage logs. Credit card statements alone do not satisfy IRS substantiation requirements for travel, meals, or listed property.",
      },
    ],
    relatedCalculators: [
      {
        name: "1099 Contractor Tax Calculator",
        href: "/tax-calculators/1099",
        description: "Input gross 1099 revenue and business expenses to estimate true tax liability.",
      },
      {
        name: "Self-Employed Tax Calculator",
        href: "/tax-calculators/self-employed",
        description: "Calculate Schedule SE self-employment tax on net 1099 income.",
      },
    ],
    relatedGuides: [
      "how-self-employment-tax-works",
      "quarterly-estimated-tax-guide",
    ],
    faqs: [
      {
        question: "Can I deduct my home office as a 1099 contractor?",
        answer:
          "Yes, if you use a portion of your home exclusively and regularly as your principal place of business. You can use the IRS simplified method ($5 per square foot up to 300 sq ft) or actual proportional home expenses.",
      },
      {
        question: "What is the difference between W-2 wages and 1099 compensation?",
        answer:
          "W-2 employees have taxes withheld automatically by their employer, who also pays half of their FICA taxes. 1099 contractors receive gross compensation, pay full self-employment tax, but can deduct ordinary business expenses.",
      },
    ],
  },
  {
    slug: "quarterly-estimated-tax-guide",
    title: "Quarterly Estimated Taxes Guide: Form 1040-ES & Safe Harbor Rules",
    description:
      "A complete walkthrough of Form 1040-ES quarterly estimated payments, penalty prevention, due dates, and calculation methodologies.",
    publishedAt: "2025-10-20T14:00:00Z",
    updatedAt: "2025-11-26T16:00:00Z",
    taxYear: 2025,
    category: "Quarterly Taxes",
    author: "TaxAIHelp Tax Research Group",
    readingTime: "6 min read",
    seoTitle: "Quarterly Estimated Taxes Guide: Form 1040-ES & Penalty Prevention",
    seoDescription:
      "Learn how to calculate and pay quarterly estimated taxes using IRS Form 1040-ES, meet safe harbor thresholds, and avoid IRC § 6654 penalties.",
    canonicalUrl: "https://taxaihelp.com/tax-guides/quarterly-estimated-tax-guide",
    schemaType: "Article",
    statutorySources: [
      "IRC § 6654: Failure by Individual to Pay Estimated Income Tax",
      "IRS Form 1040-ES Estimated Tax for Individuals",
      "IRS Publication 505: Tax Withholding and Estimated Tax",
    ],
    keyTakeaways: [
      "Quarterly payments are required if you expect to owe $1,000 or more in federal taxes.",
      "Four standard installment deadlines occur in April, June, September, and January.",
      "Meeting safe harbor rules (paying 90% of current year or 100%/110% of prior year tax) protects you from penalties.",
    ],
    sections: [
      {
        heading: "1. The Pay-As-You-Go Federal Requirement",
        content:
          "The federal income tax is a pay-as-you-go tax. You must pay tax as you earn or receive income during the year, either through wage withholding or quarterly estimated payments. If you don't pay enough tax throughout the year, you may be charged an underpayment penalty under IRC § 6654, even if you are due a refund when you file your annual return.",
      },
      {
        heading: "2. The Four Official Payment Periods",
        content:
          "Quarterly estimated tax payments do not correspond to clean three-month quarters. The statutory payment periods are: Q1 (Jan 1 – Mar 31, due April 15), Q2 (Apr 1 – May 31, due June 15), Q3 (Jun 1 – Aug 31, due September 15), and Q4 (Sep 1 – Dec 31, due January 15 of following year). If any due date falls on a Saturday, Sunday, or legal holiday, payments are timely if made on the next business day.",
      },
      {
        heading: "3. Safe Harbor Protection Against Underpayment Penalties",
        content:
          "You will generally avoid an underpayment penalty if your total withholding and timely estimated payments equal at least: (1) 90% of the tax shown on your current-year return, or (2) 100% of the tax shown on your prior-year return (increased to 110% if your prior-year Adjusted Gross Income was over $150,000 for married couples or $75,000 for single filers).",
      },
    ],
    relatedCalculators: [
      {
        name: "Quarterly Tax Calculator",
        href: "/tax-calculators/quarterly-tax",
        description: "Calculate your Form 1040-ES installments across all 4 due dates.",
      },
      {
        name: "1099 Contractor Tax Calculator",
        href: "/tax-calculators/1099",
        description: "Estimate contractor net profit to determine quarterly obligations.",
      },
    ],
    relatedGuides: [
      "how-self-employment-tax-works",
      "1099-contractor-tax-basics",
    ],
    faqs: [
      {
        question: "Can I pay estimated taxes online?",
        answer:
          "Yes. The IRS accepts online payments through IRS Direct Pay (free from a bank account) and the Electronic Federal Tax Payment System (EFTPS). Select 'Estimated Tax' and the relevant tax year.",
      },
      {
        question: "What if my income fluctuates significantly each quarter?",
        answer:
          "If your business earns income unevenly throughout the year (e.g. seasonal consulting), you can compute your required installment using the Annualized Income Installment Method on IRS Form 2210.",
      },
    ],
  },
  {
    slug: "standard-deduction-vs-itemized-deductions",
    title: "Standard Deduction vs. Itemized Deductions: Which Should You Claim?",
    description:
      "Compare standard deduction thresholds for 2025 and 2026 against Schedule A itemized deductions, including mortgage interest, SALT caps, and medical expenses.",
    publishedAt: "2025-10-25T15:00:00Z",
    updatedAt: "2025-11-28T11:00:00Z",
    taxYear: 2025,
    category: "Tax Basics",
    author: "TaxAIHelp Tax Research Group",
    readingTime: "5 min read",
    seoTitle: "Standard Deduction vs Itemized Deductions (2025 & 2026)",
    seoDescription:
      "Learn whether to claim the standard deduction ($15,750 / $31,500 in 2025) or itemize on Schedule A based on mortgage interest and SALT limits.",
    canonicalUrl: "https://taxaihelp.com/tax-guides/standard-deduction-vs-itemized-deductions",
    schemaType: "Article",
    statutorySources: [
      "IRC § 63: Taxable Income Defined",
      "IRS IRB 2025-45 / P.L. 119-21 (OBBBA)",
      "IRS Revenue Procedure 2025-32",
    ],
    keyTakeaways: [
      "For 2025, standard deductions are $15,750 for Single / $31,500 for Married Filing Jointly.",
      "For 2026, standard deductions increase to $16,100 for Single / $32,200 for Married Filing Jointly.",
      "Itemizing on Schedule A only benefits taxpayers whose total allowable deductions exceed their standard deduction threshold.",
    ],
    sections: [
      {
        heading: "1. The High Standard Deduction Baseline",
        content:
          "Under the One Big Beautiful Bill Act (P.L. 119-21) and subsequent inflation adjustments, the standard deduction provides a substantial reduction of taxable income with zero documentation requirements. In 2025, Single filers receive $15,750 ($31,500 for MFJ; $23,625 for HOH). In 2026, this increases to $16,100 ($32,200 for MFJ; $24,150 for HOH). More than 85% of US individual taxpayers claim the standard deduction.",
      },
      {
        heading: "2. Common Schedule A Itemized Deductions",
        content:
          "You should only itemize if the sum of your qualified Schedule A deductions exceeds your standard deduction. Allowable itemized deductions include: state and local taxes (SALT capped at $10,000), qualified home mortgage interest on debt up to $750,000, unreimbursed medical expenses exceeding 7.5% of AGI, and charitable contributions to qualified 501(c)(3) organizations.",
      },
      {
        heading: "3. The Impact of the $10,000 SALT Cap",
        content:
          "The statutory $10,000 limitation on state and local property, income, and sales tax deductions prevents many high-tax state residents from surpassing the high standard deduction threshold unless they also have substantial mortgage interest or major charitable donations.",
      },
    ],
    relatedCalculators: [
      {
        name: "Federal Income Tax Calculator",
        href: "/tax-calculators/income-tax",
        description: "Calculate your federal tax using official 2025 and 2026 standard deductions.",
      },
      {
        name: "2025 Income Tax Calculator",
        href: "/tax-calculators/2025-federal-income-tax-calculator",
        description: "Model your taxes with the $15,750 / $31,500 standard deduction.",
      },
    ],
    relatedGuides: [
      "how-federal-income-tax-works",
      "marginal-vs-effective-tax-rate-explained",
    ],
    faqs: [
      {
        question: "Can married filing separately spouses choose different deduction methods?",
        answer:
          "No. Under IRC § 63(c)(6), if one spouse itemizes on a separate return, the other spouse cannot claim the standard deduction and must also itemize (even if their itemized deductions equal $0).",
      },
      {
        question: "Do self-employed business expenses count as itemized deductions?",
        answer:
          "No. Business expenses for 1099 contractors and sole proprietors are reported on Schedule C and deducted directly from gross business receipts before AGI is calculated, completely independent of whether you itemize or take the standard deduction on Form 1040.",
      },
    ],
  },
  {
    slug: "marginal-vs-effective-tax-rate-explained",
    title: "Marginal vs. Effective Tax Rate: What's the Difference?",
    description:
      "Understand the crucial difference between your top marginal bracket rate and your true effective tax rate, with real numerical examples.",
    publishedAt: "2025-10-28T16:00:00Z",
    updatedAt: "2025-11-29T10:00:00Z",
    taxYear: 2025,
    category: "Tax Basics",
    author: "TaxAIHelp Tax Research Group",
    readingTime: "5 min read",
    seoTitle: "Marginal vs Effective Tax Rate Explained: Formulas & Examples",
    seoDescription:
      "Learn the difference between marginal tax brackets and your true effective tax rate. See why higher tax brackets do not reduce total net pay.",
    canonicalUrl: "https://taxaihelp.com/tax-guides/marginal-vs-effective-tax-rate-explained",
    schemaType: "Article",
    statutorySources: [
      "IRC § 1: Tax Imposed",
      "IRS Revenue Procedure 2024-40 & 2025-32",
    ],
    keyTakeaways: [
      "Marginal tax rate is the percentage paid on your last dollar of taxable income.",
      "Effective tax rate is your total federal tax divided by your total income.",
      "Your effective tax rate is always significantly lower than your highest marginal tax bracket.",
    ],
    sections: [
      {
        heading: "1. Marginal Tax Rate Defined",
        content:
          "Your marginal tax rate is the highest bracket that applies to your taxable income. For example, if a Single filer in 2025 has $60,000 of taxable income, their top dollar falls in the 22% bracket (which spans $48,475 to $103,350). Their marginal rate is 22%. This means earning one additional dollar will result in 22 cents of federal income tax.",
      },
      {
        heading: "2. Effective Tax Rate Defined",
        content:
          "Your effective tax rate is the actual percentage of your total income paid to the federal government. It is calculated as: Total Federal Tax Liability divided by Total Income. In the example above, even though the taxpayer's marginal rate is 22%, their first $15,750 was tax-free (standard deduction), the next $11,925 was taxed at only 10%, and the next $36,550 at 12%. Their effective tax rate is only approximately 10.5%.",
      },
      {
        heading: "3. The Critical Planning Difference",
        content:
          "Understanding the distinction prevents widespread financial misconceptions. Many workers decline overtime or additional freelance projects fearing that entering a higher tax bracket will reduce their take-home pay. Because higher marginal rates only apply to dollars within that upper bracket, extra income always increases your total after-tax net earnings.",
      },
    ],
    relatedCalculators: [
      {
        name: "Federal Income Tax Calculator",
        href: "/tax-calculators/income-tax",
        description: "View both your marginal bracket and effective tax rate in real-time.",
      },
      {
        name: "Self-Employed Tax Calculator",
        href: "/tax-calculators/self-employed",
        description: "Analyze combined income and self-employment effective rates.",
      },
    ],
    relatedGuides: [
      "how-federal-income-tax-works",
      "standard-deduction-vs-itemized-deductions",
    ],
    faqs: [
      {
        question: "Can deductions reduce my marginal tax rate?",
        answer:
          "Yes. If an above-the-line deduction (such as a traditional IRA contribution or HSA contribution) reduces your taxable income below a bracket threshold, your top marginal rate drops to the next lower bracket.",
      },
      {
        question: "Does effective tax rate include state taxes?",
        answer:
          "The effective tax rate displayed in TaxAIHelp calculators reflects US federal income and self-employment taxes only. State and local taxes are assessed independently by individual states.",
      },
    ],
  },
];

export function getGuideBySlug(slug: string): TaxGuide | undefined {
  return TAX_GUIDES.find((g) => g.slug === slug);
}

export function getGuidesByCategory(category: string): TaxGuide[] {
  return TAX_GUIDES.filter((g) => g.category === category);
}

export const TAX_GUIDE_CATEGORIES: string[] = [
  "Federal Taxes",
  "Self-Employment Taxes",
  "1099 Taxes",
  "Quarterly Taxes",
  "Tax Planning",
  "Tax Basics",
];
