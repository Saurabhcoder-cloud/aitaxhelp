export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}
