import * as React from "react";
import { ToastActionElement, type ToastProps } from "@radix-ui/react-toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Toast = Omit<ToasterToast, "id">;

type ToastContextT = {
  toasts: ToasterToast[];
  toast: (props: Toast) => void;
  dismiss: (toastId?: string) => void;
};

const ToastContext = React.createContext<ToastContextT | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToasterProvider");
  }
  return context;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const toast = React.useCallback((props: Toast) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...props, id }]);
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    if (!toastId) {
      setToasts([]);
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }
  }, []);

  const value = React.useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export type { Toast, ToasterToast };
