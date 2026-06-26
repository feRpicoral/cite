"use client";

import type { CitationVerdict, DocumentFormat } from "@prisma/client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { DocumentLocation } from "@/lib/ingestion/location";

export interface ViewerTarget {
  documentId: string;
  documentName: string;
  location: DocumentLocation;
  format?: DocumentFormat;
  displayIndex?: number;
  quote?: string;
  verdict?: CitationVerdict | null;
  confidence?: number | null;
  /** Bumped on every open() so re-clicking the same citation re-highlights. */
  activationId?: number;
}

interface ViewerContextValue {
  target: ViewerTarget | null;
  open: (target: ViewerTarget) => void;
  close: () => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ViewerTarget | null>(null);
  const activationRef = useRef(0);
  const open = useCallback((t: ViewerTarget) => {
    activationRef.current += 1;
    setTarget({ ...t, activationId: activationRef.current });
  }, []);
  const close = useCallback(() => setTarget(null), []);
  const value = useMemo(() => ({ target, open, close }), [target, open, close]);
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside ViewerProvider");
  return ctx;
}
