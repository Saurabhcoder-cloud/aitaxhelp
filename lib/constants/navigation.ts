import { NavItem, FooterSection } from "../../types/navigation";

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Tax Calculators",
    href: "/tax-calculators",
    children: [
      {
        title: "Income Tax Calculator",
        href: "/tax-calculators/income-tax",
        description: "Calculate standard federal taxes for W-2 wage earners.",
      },
      {
        title: "Self-Employed Tax Calculator",
        href: "/tax-calculators/self-employed",
        description: "Calculate Schedule SE self-employment and income tax.",
      },
      {
        title: "1099 Tax Calculator",
        href: "/tax-calculators/1099",
        description: "Estimate contractor taxes and deductible business expenses.",
      },
      {
        title: "Quarterly Tax Calculator",
        href: "/tax-calculators/quarterly-tax",
        description: "Determine Form 1040-ES estimated quarterly payments.",
      },
    ],
  },
  {
    title: "AI Tax Assistant",
    href: "/ai-tax-assistant",
    badge: "AI Powered",
  },
  {
    title: "Tax Resources",
    href: "/tax-resources",
  },
  {
    title: "Tax Professionals",
    href: "/tax-professionals",
  },
  {
    title: "Pricing",
    href: "/pricing",
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
      { title: "All Calculators Hub", href: "/tax-calculators" },
    ],
  },
  {
    title: "Platform",
    links: [
      { title: "AI Tax Assistant", href: "/ai-tax-assistant" },
      { title: "Tax Resources & Guides", href: "/tax-resources" },
      { title: "Tax Professionals (CPA/EA)", href: "/tax-professionals" },
      { title: "Pricing & Plans", href: "/pricing" },
      { title: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About TaxAIHelp", href: "/about" },
      { title: "Contact Us", href: "/contact" },
      { title: "Frequently Asked Questions", href: "/faq" },
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
