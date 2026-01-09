"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToasterProvider, useToast } from "./use-toast";

function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <ToastPrimitives.Viewport className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-[420px] flex-col gap-2 p-4 outline-none">
      {toasts.map((toast) => (
        <ToastPrimitives.Root
          key={toast.id}
          duration={toast.duration ?? 3000}
          className={cn(
            "relative overflow-hidden rounded-xl border border-border bg-background p-4 shadow-lg data-[state=open]:animate-toast-in",
            toast.className
          )}
          onOpenChange={(open: boolean) => {
            if (!open) dismiss(toast.id);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
              {toast.description && (
                <div className="mt-1 text-sm text-muted-foreground">{toast.description}</div>
              )}
            </div>
            <button
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {toast.action}
        </ToastPrimitives.Root>
      ))}
    </ToastPrimitives.Viewport>
  );
}

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitives.Provider swipeDirection="right">
      <ToasterProvider>
        {children}
        <ToastViewport />
      </ToasterProvider>
    </ToastPrimitives.Provider>
  );
}
