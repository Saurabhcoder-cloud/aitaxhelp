// Minimal module shims for environments without installed type packages.
declare module "next-intl" {
  export type TranslationFn = ((key: string, values?: Record<string, any>) => string) & {
    raw: (key: string) => any;
  };
  export function useTranslations(namespace?: string): TranslationFn;
  export function useLocale(): string;
  export const NextIntlClientProvider: any;
}

declare module "@hookform/resolvers/zod" {
  export const zodResolver: (schema: unknown) => unknown;
}

declare module "react-hook-form" {
  export interface FieldErrors<T = any> {
    [key: string]: any;
  }
  export interface UseFormReturn<T = any> {
    register: any;
    handleSubmit: any;
    reset: any;
    watch: any;
    setValue?: any;
    formState: { errors: FieldErrors<T> };
  }
  export function useForm<T = any>(options?: any): UseFormReturn<T>;
}

declare module "zod" {
  export const z: any;
  export namespace z {
    export type infer<T> = any;
  }
  export type infer<T> = any;
  export function object(shape: any): any;
  export function string(): any;
  export function literal(value: any): any;
  export function nativeEnum(values: any): any;
  export function number(): any;
  export function boolean(): any;
  export function instanceOf<T>(expected: any): any;
}

declare module "class-variance-authority" {
  export type VariantProps<T> = {
    variant?: string;
    size?: string;
    [key: string]: any;
  };
  export function cva(...args: any[]): (...args: any[]) => any;
}

declare module "@radix-ui/react-slot" {
  export const Slot: any;
}

declare module "@radix-ui/react-checkbox" {
  export const Root: any;
  export const Indicator: any;
}

declare module "@radix-ui/react-dialog" {
  export const Root: any;
  export const Trigger: any;
  export const Portal: any;
  export const Overlay: any;
  export const Content: any;
  export const Title: any;
  export const Description: any;
  export const Close: any;
}

declare module "@radix-ui/react-tabs" {
  export const Root: any;
  export const List: any;
  export const Trigger: any;
  export const Content: any;
}

declare module "@radix-ui/react-toast" {
  export const Provider: any;
  export const Root: any;
  export const Title: any;
  export const Description: any;
  export const Close: any;
  export const Viewport: any;
  export type ToastActionElement = any;
  export type ToastProps = any;
}

declare module "@radix-ui/react-accordion" {
  export const Root: any;
  export const Item: any;
  export const Header: any;
  export const Trigger: any;
  export const Content: any;
}

declare module "lucide-react" {
  import * as React from "react";
  export const X: React.ComponentType<any>;
  export const Check: React.ComponentType<any>;
  export const ChevronDown: React.ComponentType<any>;
  const Icon: React.ComponentType<any>;
  export default Icon;
}

declare module "clsx" {
  export type ClassValue = any;
  export function clsx(...args: any[]): string;
  export default clsx;
}

declare module "tailwind-merge" {
  export function twMerge(...args: any[]): string;
  export default twMerge;
}

declare module "@prisma/client" {
  export class PrismaClient {
    constructor(...args: any[]);
    user: any;
    session: any;
    otpToken: any;
    entitlement: any;
    upload: any;
    auditEvent: any;
    consent: any;
    job: any;
    $disconnect(): Promise<void>;
  }
}

declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config?: any);
    send(...args: any[]): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input: any);
  }
}

declare module "@aws-sdk/s3-request-presigner" {
  export const getSignedUrl: (...args: any[]) => Promise<string>;
}

declare module "@aws-sdk/client-ses" {
  export class SESClient {
    constructor(config?: any);
    send(...args: any[]): Promise<any>;
  }
  export class SendEmailCommand {
    constructor(input: any);
  }
}

declare module "@aws-sdk/client-textract" {
  export class TextractClient {
    constructor(config?: any);
    send(...args: any[]): Promise<any>;
  }
  export class StartDocumentAnalysisCommand {
    constructor(input: any);
  }
  export class GetDocumentAnalysisCommand {
    constructor(input: any);
  }
}

declare module "stripe" {
  export interface StripeConstructor {
    new (key: string, opts?: any): any;
  }
  const Stripe: StripeConstructor;
  export default Stripe;
}

// Allow importing asset and style modules in tests/builds without full type packages.
declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.svg" {
  const content: any;
  export default content;
}
