/**
 * Gemini AI Configuration (Server-Only Boundary)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. GEMINI_API_KEY is STRICTLY a server-side environment variable.
 * 2. It must NEVER be exposed as NEXT_PUBLIC_GEMINI_API_KEY.
 * 3. Gemini is an explanation and intent-extraction system, NEVER the calculation authority.
 */

export const GEMINI_CONFIG = {
  modelName: "gemini-1.5-flash",
  temperature: 0.2, // Low temperature for high factual consistency
  maxOutputTokens: 1024,
  apiKey: process.env.GEMINI_API_KEY || "",
  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  },
};
