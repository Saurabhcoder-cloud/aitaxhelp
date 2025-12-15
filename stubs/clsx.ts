export type ClassValue = any;
export default function clsx(...args: any[]): string {
  return args.filter(Boolean).join(" ");
}
export function clsxFn(...args: any[]): string {
  return clsx(...args);
}
export { clsx as clsx };
