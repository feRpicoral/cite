"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { NewRegionCommentPopover } from "@/components/viewer/new-region-comment-popover";
import { RegionCommentPin } from "@/components/viewer/region-comment-pin";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DocumentLocation } from "@/lib/ingestion/location";
import { cn } from "@/lib/utils";
import { bboxToViewportRect } from "@/lib/viewer/coords";
import { findQuoteRange } from "@/lib/viewer/locate-text";

interface PdfViewerProps {
  url: string;
  documentId: string;
  location: Extract<DocumentLocation, { kind: "pdf" }>;
  currentUserId: string;
  displayIndex?: number;
  quote?: string;
  activation?: number;
}

const BASE_SCALE = 1.4;
const ZOOM_STEP = 25;
const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const ZOOM_DEFAULT = 100;

// pdf.worker.min.mjs is copied into public/ by scripts/copy-pdf-worker.mjs
// on postinstall, so the browser fetches it from our own origin.
const WORKER_SRC = "/pdf.worker.min.mjs";

interface PdfViewport {
  width: number;
  height: number;
  convertToPdfPoint: (x: number, y: number) => number[];
  convertToViewportRectangle: (rect: number[]) => number[];
}

interface State {
  page: number;
  totalPages: number | null;
  viewport: PdfViewport | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "loadingStart" }
  | { type: "loaded"; totalPages: number; viewport: PdfViewport }
  | { type: "error"; message: string }
  | { type: "setPage"; page: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loadingStart":
      return { ...state, loading: true, error: null };
    case "loaded":
      return {
        ...state,
        loading: false,
        totalPages: action.totalPages,
        viewport: action.viewport,
      };
    case "error":
      return { ...state, loading: false, error: action.message };
    case "setPage":
      return { ...state, page: action.page, viewport: null };
  }
}

interface PendingSelection {
  bbox: [number, number, number, number];
  anchor: { left: number; top: number };
}

interface RegionPin {
  commentId: string;
  location: Extract<DocumentLocation, { kind: "pdf" }>;
  resolved: boolean;
}

export function PdfViewer({
  url,
  documentId,
  location,
  currentUserId,
  displayIndex,
  quote,
  activation,
}: PdfViewerProps) {
  const t = useTranslations("documentViewer");
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [docReady, setDocReady] = useState(false);

  const [state, dispatch] = useReducer(reducer, {
    page: location.page + 1,
    totalPages: null,
    viewport: null,
    loading: true,
    error: null,
  });
  const { page, totalPages, viewport, loading, error } = state;
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [pins, setPins] = useState<RegionPin[]>([]);

  // Snap to the citation's page whenever the citation changes. We key off a
  // signature of the full location (page + bbox), not just the page number,
  // so clicking another citation on the *same* page after the user has
  // chevron-navigated away still snaps the viewer back. Tracking the prior
  // signature with a ref keeps chevron navigation working in between.
  // `activation` is part of the key so re-clicking the same citation (after
  // chevron-navigating away) snaps back to its page and re-highlights.
  const locationKey = `${location.page}:${location.bbox.join(",")}:${activation ?? ""}`;
  const lastLocationKeyRef = useRef(locationKey);
  useEffect(() => {
    if (lastLocationKeyRef.current !== locationKey) {
      lastLocationKeyRef.current = locationKey;
      dispatch({ type: "setPage", page: location.page + 1 });
    }
  }, [locationKey, location.page]);

  // Load the document once per url. The PDFDocumentProxy is cached in a ref
  // and reused across page turns; re-fetching and re-parsing on every page
  // change would re-download the whole file and leak the proxy. destroy()
  // frees the worker-side document and its buffers on url change / unmount.
  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    // Force the render effect to re-run for the new url even when a doc was
    // already ready; toggling back to true after load is what re-triggers it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocReady(false);

    void (async () => {
      dispatch({ type: "loadingStart" });
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        setDocReady(true);
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "error",
            message: err instanceof Error ? err.message : "Failed to load PDF",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
      void doc?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!docReady) return;
    const doc = docRef.current;
    if (!doc) return;

    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    void (async () => {
      dispatch({ type: "loadingStart" });
      try {
        const pdfjs = await import("pdfjs-dist");

        const targetPage = Math.min(Math.max(1, page), doc.numPages);
        const pdfPage = await doc.getPage(targetPage);
        if (cancelled) return;

        const scale = BASE_SCALE * (zoom / 100);
        const pageViewport = pdfPage.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = pageViewport.width * dpr;
        canvas.height = pageViewport.height * dpr;
        canvas.style.width = `${pageViewport.width}px`;
        canvas.style.height = `${pageViewport.height}px`;
        ctx.scale(dpr, dpr);

        renderTask = pdfPage.render({ canvasContext: ctx, viewport: pageViewport, canvas });
        await renderTask.promise;
        if (cancelled) return;

        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.replaceChildren();
          textLayerDiv.style.width = `${pageViewport.width}px`;
          textLayerDiv.style.height = `${pageViewport.height}px`;
          const textLayer = new pdfjs.TextLayer({
            textContentSource: pdfPage.streamTextContent(),
            container: textLayerDiv,
            viewport: pageViewport,
          });
          await textLayer.render();
          if (cancelled) return;
        }

        const overlay = overlayRef.current;
        if (overlay) {
          // Always clear: the prior render may have drawn a highlight from
          // a citation on a different page, and we don't want it lingering
          // when the user chevron-navigates away from the cited page.
          overlay.replaceChildren();
          overlay.style.width = `${pageViewport.width}px`;
          overlay.style.height = `${pageViewport.height}px`;
          if (page === location.page + 1) {
            // Prefer highlighting the exact cited text in the text layer; the
            // chunk bbox is a whole paragraph/block, so it would cover far too
            // much. Fall back to the bbox only when the quote can't be located.
            const layer = textLayerRef.current;
            const range = layer && quote ? findQuoteRange(layer, quote) : null;
            const rects =
              range && range.getClientRects().length > 0
                ? rectsRelativeTo(range, layer!)
                : [bboxToViewportRect(location.bbox, pageViewport)];

            let first: HTMLElement | null = null;
            for (const rect of rects) {
              const hl = document.createElement("div");
              hl.className =
                "bg-highlight/40 ring-highlight-border pointer-events-none absolute rounded-[2px] ring-1";
              hl.style.left = `${rect.left}px`;
              hl.style.top = `${rect.top}px`;
              hl.style.width = `${rect.width}px`;
              hl.style.height = `${rect.height}px`;
              if (!first) {
                first = hl;
                if (displayIndex != null) {
                  const badge = document.createElement("span");
                  badge.className =
                    "bg-highlight-border absolute -top-2 -left-2 flex h-[17px] items-center rounded-[5px] px-1.5 font-mono text-[10px] font-semibold text-white";
                  badge.textContent = String(displayIndex);
                  hl.appendChild(badge);
                }
              }
              overlay.appendChild(hl);
            }
            first?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }

        dispatch({
          type: "loaded",
          totalPages: doc.numPages,
          viewport: pageViewport as unknown as PdfViewport,
        });
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
  }, [docReady, page, zoom, location.bbox, location.page, displayIndex, quote, activation]);

  const refreshPins = useCallback(async () => {
    const res = await fetch(`/api/comments?targetType=DOCUMENT_REGION&targetId=${documentId}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      comments: { id: string; location: unknown; resolvedAt: string | null }[];
    };
    setPins(
      data.comments
        .map((c) => {
          const loc = c.location as DocumentLocation | null;
          if (!loc || loc.kind !== "pdf") return null;
          return { commentId: c.id, location: loc, resolved: c.resolvedAt != null };
        })
        .filter((p): p is RegionPin => p !== null),
    );
  }, [documentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPins();
  }, [refreshPins]);

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const textLayer = textLayerRef.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !textLayer || !viewport) {
      setPending(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!textLayer.contains(range.commonAncestorContainer)) {
      setPending(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const layerRect = textLayer.getBoundingClientRect();
    const localX0 = rect.left - layerRect.left;
    const localY0 = rect.top - layerRect.top;
    const localX1 = rect.right - layerRect.left;
    const localY1 = rect.bottom - layerRect.top;

    const [px0 = 0, py0 = 0] = viewport.convertToPdfPoint(localX0, localY0);
    const [px1 = 0, py1 = 0] = viewport.convertToPdfPoint(localX1, localY1);
    const bbox: [number, number, number, number] = [
      Math.min(px0, px1),
      Math.min(py0, py1),
      Math.max(px0, px1),
      Math.max(py0, py1),
    ];

    setPending({ bbox, anchor: { left: localX1, top: localY1 } });
  }, [viewport]);

  const createRegionComment = useCallback(
    async (body: string) => {
      if (!pending) return;
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "DOCUMENT_REGION",
          targetId: documentId,
          body,
          location: {
            kind: "pdf",
            page: page - 1,
            charStart: 0,
            charEnd: 0,
            bbox: pending.bbox,
          } satisfies DocumentLocation,
        }),
      });
      setPending(null);
      window.getSelection()?.removeAllRanges();
      if (res.ok) await refreshPins();
    },
    [pending, documentId, page, refreshPins],
  );

  const goPrev = () => dispatch({ type: "setPage", page: Math.max(1, page - 1) });
  const goNext = () =>
    dispatch({ type: "setPage", page: totalPages ? Math.min(totalPages, page + 1) : page + 1 });
  const pinPositions = pinsForCurrentPage(pins, page, viewport);
  const pageCount = t("pageCount", { page, total: totalPages ?? "—" });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isMobile && (
        <div className="bg-muted/20 flex h-[38px] shrink-0 items-center gap-1.5 border-b px-3">
          <ToolbarButton onClick={goPrev} disabled={page <= 1} aria-label={t("previousPage")}>
            <ChevronLeft className="size-3.5" />
          </ToolbarButton>
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {pageCount}
          </span>
          <ToolbarButton
            onClick={goNext}
            disabled={totalPages != null && page >= totalPages}
            aria-label={t("nextPage")}
          >
            <ChevronRight className="size-3.5" />
          </ToolbarButton>
          <div className="ml-auto flex items-center gap-1.5">
            <ToolbarButton
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
              aria-label={t("zoomOut")}
            >
              <Minus className="size-3.5" />
            </ToolbarButton>
            <span className="text-muted-foreground w-9 text-center font-mono text-[11px] tabular-nums">
              {zoom}%
            </span>
            <ToolbarButton
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
              aria-label={t("zoomIn")}
            >
              <Plus className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setZoom(ZOOM_DEFAULT)}
              className="w-auto px-2 text-[10.5px]"
            >
              {t("fit")}
            </ToolbarButton>
          </div>
        </div>
      )}

      <div className="bg-muted/40 relative flex-1 overflow-auto p-4">
        <div className="relative mx-auto inline-block" onMouseUp={onMouseUp}>
          <canvas ref={canvasRef} className="rounded-sm shadow" />
          <div ref={textLayerRef} className="cite-text-layer" />
          <div ref={overlayRef} className="pointer-events-none absolute inset-0" />
          {pinPositions.map((p) => (
            <RegionCommentPin
              key={p.commentId}
              documentId={documentId}
              commentId={p.commentId}
              currentUserId={currentUserId}
              resolved={p.resolved}
              side="left"
              style={{ left: p.rect.left + 6, top: p.rect.top - 12 }}
              onChange={() => void refreshPins()}
            />
          ))}
          {pending && (
            <NewRegionCommentPopover
              anchor={{ left: pending.anchor.left, top: pending.anchor.top }}
              onSubmit={createRegionComment}
              onCancel={() => setPending(null)}
            />
          )}
        </div>
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-[11px] font-medium">
            <span className="text-primary animate-cite-spin size-3 rounded-full border-2 border-current border-t-transparent" />
            {totalPages != null ? t("rendering", { page, total: totalPages }) : t("loading")}
          </div>
        )}
        {error && <p className="text-destructive p-4 text-sm">{error}</p>}
      </div>

      {isMobile && (
        <div className="flex h-[46px] shrink-0 items-center justify-center gap-3 border-t">
          <button
            type="button"
            onClick={goPrev}
            disabled={page <= 1}
            aria-label={t("previousPage")}
            className="text-muted-foreground disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {t("pageLabel", { page, total: totalPages ?? "—" })}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={totalPages != null && page >= totalPages}
            aria-label={t("nextPage")}
            className="text-muted-foreground disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      className={cn("bg-card size-6 shadow-none", className)}
      {...props}
    />
  );
}

function rectsRelativeTo(
  range: Range,
  layer: HTMLElement,
): { left: number; top: number; width: number; height: number }[] {
  const layerRect = layer.getBoundingClientRect();
  return Array.from(range.getClientRects()).map((r) => ({
    left: r.left - layerRect.left,
    top: r.top - layerRect.top,
    width: r.width,
    height: r.height,
  }));
}

function pinsForCurrentPage(
  pins: RegionPin[],
  page: number,
  viewport: PdfViewport | null,
): { commentId: string; resolved: boolean; rect: { left: number; top: number } }[] {
  if (!viewport) return [];
  return pins
    .filter((p) => p.location.page === page - 1)
    .map((p) => {
      const r = viewport.convertToViewportRectangle([...p.location.bbox]);
      const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = r;
      return {
        commentId: p.commentId,
        resolved: p.resolved,
        rect: {
          left: Math.max(x0, x1),
          top: Math.min(y0, y1),
        },
      };
    });
}
