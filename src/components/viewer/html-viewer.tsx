"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

import type { DocumentLocation } from "@/lib/ingestion/location";
import { clearHighlights, highlightRange, locateHtmlRange } from "@/lib/viewer/locate-html";

interface HtmlViewerProps {
  documentId: string;
  location: Extract<DocumentLocation, { kind: "html" }>;
}

interface PartResponse {
  body: string;
  metadata: { kind: "html"; heading: string | null };
  index: number;
}

interface State {
  html: string | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "loadingStart" }
  | { type: "loaded"; html: string }
  | { type: "error"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loadingStart":
      return { html: null, loading: true, error: null };
    case "loaded":
      return { html: action.html, loading: false, error: null };
    case "error":
      return { html: null, loading: false, error: action.message };
  }
}

export function HtmlViewer({ documentId, location }: HtmlViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    html: null,
    loading: true,
    error: null,
  });
  const { html, loading, error } = state;

  // HTML/MD/DOCX documents store the citation against a structural selector
  // alone — there's no part index in the location. We render the first part
  // for now; multi-part navigation lands in Phase 8 polish.
  const partIndex = 0;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      dispatch({ type: "loadingStart" });
      try {
        const res = await fetch(`/api/documents/${documentId}/part/${partIndex}`);
        if (!res.ok) throw new Error(`Failed to load part (${res.status})`);
        const data = (await res.json()) as PartResponse;
        if (!cancelled) dispatch({ type: "loaded", html: data.body });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "error",
            message: err instanceof Error ? err.message : "Failed to load",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    if (!html) return;
    const root = containerRef.current;
    if (!root) return;

    clearHighlights(root);
    const range = locateHtmlRange(root, location.selector, location.charStart, location.charEnd);
    if (!range) return;
    const mark = highlightRange(range);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [html, location.selector, location.charStart, location.charEnd]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-muted/30 flex-1 overflow-auto p-6">
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        )}
        {error && <p className="text-destructive p-4 text-sm">{error}</p>}
        {html && (
          <article
            ref={containerRef}
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
