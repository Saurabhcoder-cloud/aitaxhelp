export function useForm<T = any>() {
  return {
    register: () => ({} as any),
    handleSubmit: (fn: any) => fn,
    reset: () => undefined,
    watch: () => ({} as any),
    setValue: () => undefined,
    formState: { errors: {} as Record<string, any> },
  };
}
