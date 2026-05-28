"use client";

import { ChevronLeft, ChevronRight, Loader2, MessageSquare, MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { CommentThread } from "@/components/comments/comment-thread";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DocumentLocation } from "@/lib/ingestion/location";
import { cn } from "@/lib/utils";
import { bboxToViewportRect } from "@/lib/viewer/coords";

interface PdfViewerProps {
  url: string;
  documentId: string;
  location: Extract<DocumentLocation, { kind: "pdf" }>;
  currentUserId: string;
}

const SCALE = 1.4;

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

export function PdfViewer({ url, documentId, location, currentUserId }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [state, dispatch] = useReducer(reducer, {
    page: location.page + 1,
    totalPages: null,
    viewport: null,
    loading: true,
    error: null,
  });
  const { page, totalPages, viewport, loading, error } = state;
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [pins, setPins] = useState<RegionPin[]>([]);

  // Snap to the citation's page whenever the citation changes. We key off a
  // signature of the full location (page + every highlighted bbox), not just
  // the page number, so clicking another citation on the *same* page after
  // the user has chevron-navigated away still snaps the viewer back.
  // Tracking the prior signature with a ref keeps chevron navigation working
  // in between.
  const locationKey = `${location.page}:${(location.bboxes ?? [location.bbox]).flat().join(",")}`;
  const lastLocationKeyRef = useRef(locationKey);
  useEffect(() => {
    if (lastLocationKeyRef.current !== locationKey) {
      lastLocationKeyRef.current = locationKey;
      dispatch({ type: "setPage", page: location.page + 1 });
    }
  }, [locationKey, location.page]);

  // Render the canvas + text layer for the current page. Re-runs whenever
  // url, page, or the citation location changes. The viewport object is
  // pushed into state on success so render and event handlers can use it
  // without touching a ref.
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

        const pageViewport = pdfPage.getViewport({ scale: SCALE });

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
            const bboxes = location.bboxes ?? [location.bbox];
            let firstEl: HTMLElement | null = null;
            for (const bbox of bboxes) {
              const rect = bboxToViewportRect(bbox, pageViewport);
              if (rect.width === 0 && rect.height === 0) continue;
              const hl = document.createElement("div");
              hl.className =
                "bg-highlight/40 border-highlight/70 pointer-events-none absolute rounded-sm border transition-opacity";
              hl.style.left = `${rect.left}px`;
              hl.style.top = `${rect.top}px`;
              hl.style.width = `${rect.width}px`;
              hl.style.height = `${rect.height}px`;
              overlay.appendChild(hl);
              firstEl ??= hl;
            }
            firstEl?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  }, [url, page, locationKey, location.bboxes, location.bbox, location.page]);

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
    // Initial fetch on mount and whenever the document changes. The setState
    // happens inside refreshPins's async body, not synchronously here.
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
            bboxes: [pending.bbox],
          } satisfies DocumentLocation,
        }),
      });
      setPending(null);
      window.getSelection()?.removeAllRanges();
      if (res.ok) await refreshPins();
    },
    [pending, documentId, page, refreshPins],
  );

  const pinPositions = pinsForCurrentPage(pins, page, viewport);

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
      <div className="bg-muted/30 relative flex-1 overflow-auto p-4">
        <div className="relative mx-auto inline-block" onMouseUp={onMouseUp}>
          <canvas ref={canvasRef} className="rounded shadow" />
          <div ref={textLayerRef} className="cite-text-layer" />
          <div ref={overlayRef} className="pointer-events-none absolute inset-0" />
          {pinPositions.map((p) => (
            <PdfRegionPin
              key={p.commentId}
              documentId={documentId}
              commentId={p.commentId}
              currentUserId={currentUserId}
              resolved={p.resolved}
              rect={p.rect}
              onChange={() => void refreshPins()}
            />
          ))}
          {pending && (
            <NewRegionCommentPopover
              anchor={pending.anchor}
              onSubmit={createRegionComment}
              onCancel={() => setPending(null)}
            />
          )}
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

function PdfRegionPin({
  documentId,
  commentId,
  currentUserId,
  resolved,
  rect,
  onChange,
}: {
  documentId: string;
  commentId: string;
  currentUserId: string;
  resolved: boolean;
  rect: { left: number; top: number };
  onChange: () => void;
}) {
  return (
    <Popover onOpenChange={(open) => !open && onChange()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View comment"
          style={{ left: rect.left + 4, top: rect.top - 12 }}
          className={cn(
            "absolute flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition-colors",
            resolved
              ? "bg-muted text-muted-foreground border-muted-foreground/20"
              : "bg-card border-border hover:bg-muted",
          )}
        >
          <MessageSquare className="h-2.5 w-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-3">
        <CommentThread
          targetType="DOCUMENT_REGION"
          targetId={documentId}
          currentUserId={currentUserId}
          focusCommentId={commentId}
        />
      </PopoverContent>
    </Popover>
  );
}

function NewRegionCommentPopover({
  anchor,
  onSubmit,
  onCancel,
}: {
  anchor: { left: number; top: number };
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <Popover open onOpenChange={(o) => !o && onCancel()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="New region comment"
          className="bg-primary text-primary-foreground absolute z-10 rounded-full p-1 shadow"
          style={{ left: anchor.left, top: anchor.top }}
        >
          <MessageSquarePlus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72 space-y-2 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Comment on this passage…"
          autoFocus
          className="border-input bg-background placeholder:text-muted-foreground w-full resize-none rounded border px-2 py-1 text-xs outline-none"
        />
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="xs"
            disabled={draft.trim().length === 0}
            onClick={() => onSubmit(draft.trim())}
          >
            Comment
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
