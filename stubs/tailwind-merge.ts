export function twMerge(...classes: any[]): string {
  return classes.filter(Boolean).join(" ");
}
export default twMerge;
