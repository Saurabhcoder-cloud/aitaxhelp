import { NavItem, FooterSection } from "../../types/navigation";

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Tax Calculators",
    href: "/tax-calculators",
    children: [
      {
        title: "Federal Income Tax Calculator",
        href: "/tax-calculators/income-tax",
        description: "Standard progressive bracket calculations for W-2 wage earners.",
      },
      {
        title: "Self-Employed Tax Calculator",
        href: "/tax-calculators/self-employed",
        description: "Schedule SE self-employment and 15.3% FICA computation.",
      },
      {
        title: "1099 Contractor Tax Calculator",
        href: "/tax-calculators/1099",
        description: "Freelance earnings and deductible business expense tracking.",
      },
      {
        title: "Quarterly Tax Calculator",
        href: "/tax-calculators/quarterly-tax",
        description: "Form 1040-ES estimated payments and voucher deadlines.",
      },
      {
        title: "2025 Federal Tax Calculator",
        href: "/tax-calculators/2025-federal-income-tax-calculator",
        description: "Tax year 2025 brackets and $15,750 standard deduction.",
      },
      {
        title: "2026 Federal Tax Calculator",
        href: "/tax-calculators/2026-federal-income-tax-calculator",
        description: "Tax year 2026 inflation brackets and $16,100 standard deduction.",
      },
    ],
  },
  {
    title: "Tax Guides",
    href: "/tax-guides",
  },
  {
    title: "Blog",
    href: "/blog",
  },
  {
    title: "AI Tax Assistant",
    href: "/ai-tax-assistant",
    badge: "AI Powered",
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "About",
    href: "/about",
  },
  {
    title: "Contact",
    href: "/contact",
  },
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Calculators",
    links: [
      { title: "Income Tax Calculator", href: "/tax-calculators/income-tax" },
      { title: "Self-Employed Tax Calculator", href: "/tax-calculators/self-employed" },
      { title: "1099 Tax Calculator", href: "/tax-calculators/1099" },
      { title: "Quarterly Tax Calculator", href: "/tax-calculators/quarterly-tax" },
      { title: "2025 Federal Calculator", href: "/tax-calculators/2025-federal-income-tax-calculator" },
      { title: "2026 Federal Calculator", href: "/tax-calculators/2026-federal-income-tax-calculator" },
      { title: "All Calculators Hub", href: "/tax-calculators" },
    ],
  },
  {
    title: "Resources & Guides",
    links: [
      { title: "Tax Guides Hub", href: "/tax-guides" },
      { title: "Tax Knowledge Blog", href: "/blog" },
      { title: "AI Tax Assistant", href: "/ai-tax-assistant" },
      { title: "Tax Resources", href: "/tax-resources" },
      { title: "Tax Professionals (CPA/EA)", href: "/tax-professionals" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About TaxAIHelp", href: "/about" },
      { title: "Pricing & Plans", href: "/pricing" },
      { title: "Contact Us", href: "/contact" },
      { title: "Frequently Asked Questions", href: "/faq" },
      { title: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal & Safety",
    links: [
      { title: "Disclaimer & Limitations", href: "/disclaimer" },
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Terms of Service", href: "/terms" },
    ],
  },
];
