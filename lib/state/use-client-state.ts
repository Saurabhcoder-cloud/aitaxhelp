"use client";

import { useEffect, useState } from "react";

export interface FlowState {
  language?: string;
  uploadId?: string;
  fileName?: string;
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

  const updateState = (next: FlowState) => {
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return { state, updateState };
}
