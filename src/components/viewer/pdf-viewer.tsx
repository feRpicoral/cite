"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { DocumentLocation } from "@/lib/ingestion/location";
import { bboxToViewportRect } from "@/lib/viewer/coords";

interface PdfViewerProps {
  url: string;
  location: Extract<DocumentLocation, { kind: "pdf" }>;
}

const SCALE = 1.4;

// PDF.js's worker is served from a CDN to avoid copying its file into public/
// on every install. Pinned to whatever pdfjs-dist version yarn resolved.
const WORKER_SRC = "https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs";

interface State {
  page: number;
  totalPages: number | null;
  loading: boolean;
  error: string | null;
  /** Bumps to force re-renders without changing the page. */
  renderTick: number;
}

type Action =
  | { type: "loadingStart" }
  | { type: "loaded"; totalPages: number }
  | { type: "error"; message: string }
  | { type: "setPage"; page: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loadingStart":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { ...state, loading: false, totalPages: action.totalPages };
    case "error":
      return { ...state, loading: false, error: action.message };
    case "setPage":
      return { ...state, page: action.page };
  }
}

export function PdfViewer({ url, location }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    page: location.page + 1,
    totalPages: null,
    loading: true,
    error: null,
    renderTick: 0,
  });
  const { page, totalPages, loading, error } = state;

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    void (async () => {
      dispatch({ type: "loadingStart" });
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;

        const targetPage = Math.min(Math.max(1, page), doc.numPages);
        const pdfPage = await doc.getPage(targetPage);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale: SCALE });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.scale(dpr, dpr);

        renderTask = pdfPage.render({ canvasContext: ctx, viewport, canvas });
        await renderTask.promise;
        if (cancelled) return;

        const overlay = overlayRef.current;
        if (overlay && page === location.page + 1) {
          overlay.innerHTML = "";
          overlay.style.width = `${viewport.width}px`;
          overlay.style.height = `${viewport.height}px`;
          const rect = bboxToViewportRect(location.bbox, viewport);
          const hl = document.createElement("div");
          hl.className =
            "bg-highlight/40 border-highlight/70 pointer-events-none absolute rounded-sm border transition-opacity";
          hl.style.left = `${rect.left}px`;
          hl.style.top = `${rect.top}px`;
          hl.style.width = `${rect.width}px`;
          hl.style.height = `${rect.height}px`;
          overlay.appendChild(hl);
          hl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        dispatch({ type: "loaded", totalPages: doc.numPages });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "error",
            message: err instanceof Error ? err.message : "Failed to render PDF",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [url, page, location.bbox, location.page]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => dispatch({ type: "setPage", page: Math.max(1, page - 1) })}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground text-xs">
          Page {page}
          {totalPages != null ? ` of ${totalPages}` : ""}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            dispatch({
              type: "setPage",
              page: totalPages ? Math.min(totalPages, page + 1) : page + 1,
            })
          }
          disabled={totalPages != null && page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="bg-muted/30 flex-1 overflow-auto p-4">
        <div className="relative mx-auto inline-block">
          <canvas ref={canvasRef} className="rounded shadow" />
          <div ref={overlayRef} className="pointer-events-none absolute inset-0" />
        </div>
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        )}
        {error && <p className="text-destructive p-4 text-sm">{error}</p>}
      </div>
    </div>
  );
}
