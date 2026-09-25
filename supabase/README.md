# Supabase Architecture & Integration Guide

## Overview
TaxAIHelp uses Supabase PostgreSQL for persistent taxpayer profiles, saved calculations, AI chat history, and professional CPA/EA referrals.

## Security Constraints
1. **Never use service-role keys** on the client or in client-bundle environments.
2. All tables are protected by **Row Level Security (RLS)** policies ensuring taxpayers can only read and write their own data.
3. The platform functions in an educational, client-side calculator capacity even before a user creates an account or connects Supabase.

## Database Tables
- `profiles`: Extends `auth.users` with personal profile metadata.
- `tax_profiles`: Tax filing status, tax year preferences, and income sources.
- `saved_calculations`: Snapshots of deterministic calculation inputs and verified engine results.
- `ai_conversations` & `ai_messages`: User dialogue with the AI assistant, referencing verified calculations.
- `tax_professional_leads`: Inquiries from users requesting human CPA or Enrolled Agent assistance.

## Migration Steps (Future Phase)
When ready to connect a live Supabase project:
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Execute `supabase/schema.sql` via the Supabase SQL Editor or CLI.
3. Populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
