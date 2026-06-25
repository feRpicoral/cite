"use client";

import { Loader2, MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DocumentLocation } from "@/lib/ingestion/location";
import {
  clearHighlights,
  highlightRange,
  locateHtmlRange,
  rangeToHtmlLocation,
} from "@/lib/viewer/locate-html";

import { RegionCommentPin } from "./region-comment-pin";

interface HtmlViewerProps {
  documentId: string;
  location: Extract<DocumentLocation, { kind: "html" }>;
  currentUserId: string;
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

export function HtmlViewer({ documentId, location, currentUserId }: HtmlViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
  }, [parts, location.partIndex, location.selector, location.charStart, location.charEnd]);

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
    const rect = range.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    setPending({
      location: { kind: "html", ...loc },
      anchor: { top: rect.bottom - rootRect.top, left: rect.left - rootRect.left },
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

  const pinPositions = usePinPositions(containerRef, parts, pins);

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="bg-muted/30 relative flex-1 overflow-auto p-6" onMouseUp={onMouseUp}>
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        )}
        {error && <p className="text-destructive p-4 text-sm">{error}</p>}
        {parts && (
          <article
            ref={containerRef}
            className="prose prose-sm dark:prose-invert mx-auto max-w-3xl pr-12"
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
            top={p.top}
            currentUserId={currentUserId}
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
    const root = containerRef.current;
    if (!root) {
      setPositions([]);
      return;
    }
    const rootRect = root.getBoundingClientRect();
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
        top: rect.top - rootRect.top + root.scrollTop,
      });
    }
    setPositions(out);
  }, [parts, pins, containerRef]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return positions;
}

function NewRegionCommentPopover({
  anchor,
  onSubmit,
  onCancel,
}: {
  anchor: { top: number; left: number };
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
          style={{ top: anchor.top, left: anchor.left }}
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
