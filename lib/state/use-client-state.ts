"use client";

import { useCallback, useEffect, useState } from "react";
import type { UploadStatus } from "@/lib/store/uploads";

export interface FlowState {
  language?: string;
  uploadId?: string;
  fileName?: string;
  uploadStatus?: UploadStatus;
}

const STORAGE_KEY = "taxhelp-flow";

export function useClientState() {
  const [state, setState] = useState<FlowState>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setState(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const updateState = useCallback((next: Partial<FlowState>) => {
    setState((prev) => {
      const merged = { ...prev, ...next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  return { state, updateState };
}
