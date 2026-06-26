"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { NewRegionCommentPopover } from "@/components/viewer/new-region-comment-popover";
import { RegionCommentPin } from "@/components/viewer/region-comment-pin";
import { ViewerLoading, ViewerUnsupported } from "@/components/viewer/viewer-states";
import type { DocumentLocation } from "@/lib/ingestion/location";
import {
  clearHighlights,
  highlightRange,
  locateHtmlRange,
  rangeToHtmlLocation,
} from "@/lib/viewer/locate-html";

interface HtmlViewerProps {
  documentId: string;
  location: Extract<DocumentLocation, { kind: "html" }>;
  currentUserId: string;
  downloadUrl: string;
  activation?: number;
}

interface PartShape {
  index: number;
  body: string;
  metadata: { kind: "html"; heading: string | null };
}

interface State {
  parts: PartShape[] | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "loadingStart" }
  | { type: "loaded"; parts: PartShape[] }
  | { type: "error"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loadingStart":
      return { parts: null, loading: true, error: null };
    case "loaded":
      return { parts: action.parts, loading: false, error: null };
    case "error":
      return { parts: null, loading: false, error: action.message };
  }
}

interface PendingSelection {
  location: Extract<DocumentLocation, { kind: "html" }>;
  anchor: { top: number; left: number };
}

export function HtmlViewer({
  documentId,
  location,
  currentUserId,
  downloadUrl,
  activation,
}: HtmlViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, { parts: null, loading: true, error: null });
  const { parts, loading, error } = state;
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [pins, setPins] = useState<RegionPin[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      dispatch({ type: "loadingStart" });
      try {
        const res = await fetch(`/api/documents/${documentId}/parts`);
        if (!res.ok) throw new Error(`Failed to load parts (${res.status})`);
        const data = (await res.json()) as { parts: PartShape[] };
        if (!cancelled) dispatch({ type: "loaded", parts: data.parts });
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
    if (!parts) return;
    const root = containerRef.current;
    if (!root) return;

    clearHighlights(root);
    const range = locateHtmlRange(
      root,
      location.partIndex,
      location.selector,
      location.charStart,
      location.charEnd,
    );
    if (!range) return;
    const mark = highlightRange(range);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });
    // `activation` re-runs this on every citation click so re-clicking the
    // open citation re-applies the highlight and re-scrolls to it.
  }, [
    parts,
    location.partIndex,
    location.selector,
    location.charStart,
    location.charEnd,
    activation,
  ]);

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
          if (!loc || loc.kind !== "html") return null;
          return { commentId: c.id, location: loc, resolved: c.resolvedAt != null };
        })
        .filter((p): p is RegionPin => p !== null),
    );
  }, [documentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPins();
  }, [refreshPins]);

  // Capture text selection: when the user releases the mouse with a non-
  // empty range inside the viewer, surface a popover at the selection's
  // bounding rect that lets them turn it into a region comment.
  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const root = containerRef.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root) {
      setPending(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setPending(null);
      return;
    }
    const loc = rangeToHtmlLocation(root, range);
    if (!loc) {
      setPending(null);
      return;
    }
    const scrollEl = scrollRef.current;
    const rect = range.getBoundingClientRect();
    const originRect = (scrollEl ?? root).getBoundingClientRect();
    const scrollTop = scrollEl?.scrollTop ?? 0;
    const scrollLeft = scrollEl?.scrollLeft ?? 0;
    setPending({
      location: { kind: "html", ...loc },
      anchor: {
        top: rect.bottom - originRect.top + scrollTop,
        left: rect.left - originRect.left + scrollLeft,
      },
    });
  }, []);

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
          location: pending.location,
        }),
      });
      setPending(null);
      window.getSelection()?.removeAllRanges();
      if (res.ok) await refreshPins();
    },
    [pending, documentId, refreshPins],
  );

  const pinPositions = usePinPositions(containerRef, scrollRef, parts, pins);

  if (loading) return <ViewerLoading />;
  if (error) {
    return (
      <div className="bg-muted/30 flex flex-1 items-center justify-center p-7">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }
  if (parts && parts.length === 0) {
    return <ViewerUnsupported downloadUrl={downloadUrl} />;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="relative flex-1 overflow-auto p-8" onMouseUp={onMouseUp}>
        {parts && (
          <article
            ref={containerRef}
            className="cite-doc prose prose-sm dark:prose-invert mx-auto max-w-3xl pr-12"
          >
            {parts.map((p) => (
              <section
                key={p.index}
                data-part-index={p.index}
                dangerouslySetInnerHTML={{ __html: p.body }}
              />
            ))}
          </article>
        )}
        {pinPositions.map((p) => (
          <RegionCommentPin
            key={p.commentId}
            documentId={documentId}
            commentId={p.commentId}
            resolved={p.resolved}
            currentUserId={currentUserId}
            side="left"
            style={{ top: p.top, right: 8 }}
            onChange={() => void refreshPins()}
          />
        ))}
        {pending && (
          <NewRegionCommentPopover
            anchor={{ top: pending.anchor.top, left: pending.anchor.left }}
            onSubmit={createRegionComment}
            onCancel={() => setPending(null)}
          />
        )}
      </div>
    </div>
  );
}

interface RegionPin {
  commentId: string;
  location: Extract<DocumentLocation, { kind: "html" }>;
  resolved: boolean;
}

/**
 * Re-computes pin Y-offsets whenever the parts re-render or the pin set
 * changes. Each pin's vertical position is the bounding rect of the
 * located range, relative to the scrolling container. Runs in a layout
 * effect so we never read ref.current during render.
 */
function usePinPositions(
  containerRef: React.RefObject<HTMLDivElement | null>,
  scrollRef: React.RefObject<HTMLDivElement | null>,
  parts: PartShape[] | null,
  pins: RegionPin[],
): { commentId: string; resolved: boolean; top: number }[] {
  const [positions, setPositions] = useState<
    { commentId: string; resolved: boolean; top: number }[]
  >([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!parts) {
      setPositions([]);
      return;
    }
    // Ranges are located within the article, but pins are positioned inside the
    // scrolling container, so coordinates must be relative to that container
    // (the article doesn't scroll — its scrollTop is always 0).
    const root = containerRef.current;
    const scrollEl = scrollRef.current;
    if (!root || !scrollEl) {
      setPositions([]);
      return;
    }
    const originRect = scrollEl.getBoundingClientRect();
    const out: { commentId: string; resolved: boolean; top: number }[] = [];
    for (const pin of pins) {
      const range = locateHtmlRange(
        root,
        pin.location.partIndex,
        pin.location.selector,
        pin.location.charStart,
        pin.location.charEnd,
      );
      if (!range) continue;
      const rect = range.getBoundingClientRect();
      out.push({
        commentId: pin.commentId,
        resolved: pin.resolved,
        top: rect.top - originRect.top + scrollEl.scrollTop,
      });
    }
    setPositions(out);
  }, [parts, pins, containerRef, scrollRef]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return positions;
}
