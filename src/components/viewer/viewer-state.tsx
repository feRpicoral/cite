"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { DocumentLocation } from "@/lib/ingestion/location";

export interface ViewerTarget {
  documentId: string;
  documentName: string;
  location: DocumentLocation;
}

interface ViewerContextValue {
  target: ViewerTarget | null;
  open: (target: ViewerTarget) => void;
  close: () => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ViewerTarget | null>(null);
  const open = useCallback((t: ViewerTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);
  const value = useMemo(() => ({ target, open, close }), [target, open, close]);
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside ViewerProvider");
  return ctx;
}
