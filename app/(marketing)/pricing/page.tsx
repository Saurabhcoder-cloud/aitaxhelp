/**
 * CANONICAL ROUTE CONSOLIDATION (Phase 5 Step 12)
 *
 * The canonical production pricing implementation is maintained at:
 * - Page: app/pricing/page.tsx (Interactive Free/Premium plans, monthly/annual toggle, feature matrix, FAQ)
 * - Layout & Metadata: app/pricing/layout.tsx
 *
 * This file previously contained an outdated Phase 1 prototype ($19/year).
 * It is now consolidated to re-export the canonical PricingPage from app/pricing/page.tsx
 * to preserve functionality and eliminate divergent pricing logic.
 *
 * Note for Next.js build validation: If your build environment flags duplicate route segments
 * for /pricing across root and (marketing) route groups, delete this file:
 * Remove-Item 'app\(marketing)\pricing\page.tsx'
 */

export { default } from "../../pricing/page";
