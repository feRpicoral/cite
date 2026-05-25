"use client";

import { X } from "lucide-react";
import { useEffect, useReducer } from "react";

import { Button } from "@/components/ui/button";
import { HtmlViewer } from "@/components/viewer/html-viewer";
import { PdfViewer } from "@/components/viewer/pdf-viewer";
import { useViewer } from "@/components/viewer/viewer-state";

interface UrlResponse {
  url: string;
  format: "PDF" | "DOCX" | "HTML" | "MD";
  name: string;
}

interface State {
  signed: UrlResponse | null;
  error: string | null;
}

type Action =
  | { type: "reset" }
  | { type: "loaded"; signed: UrlResponse }
  | { type: "error"; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { signed: null, error: null };
    case "loaded":
      return { signed: action.signed, error: null };
    case "error":
      return { signed: null, error: action.message };
  }
}

export function DocumentViewer({ currentUserId }: { currentUserId: string }) {
  const { target, close } = useViewer();
  const [state, dispatch] = useReducer(reducer, { signed: null, error: null });
  const { signed, error } = state;

  useEffect(() => {
    if (!target) {
      dispatch({ type: "reset" });
      return;
    }
    let cancelled = false;
    void (async () => {
      dispatch({ type: "reset" });
      try {
        const res = await fetch(`/api/documents/${target.documentId}/url`);
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = (await res.json()) as UrlResponse;
        if (!cancelled) dispatch({ type: "loaded", signed: data });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <p className="truncate text-xs font-medium">{target.documentName}</p>
        <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </header>
      {error && <p className="text-destructive p-4 text-sm">{error}</p>}
      {signed?.format === "PDF" && target.location.kind === "pdf" && (
        <PdfViewer
          url={signed.url}
          documentId={target.documentId}
          location={target.location}
          currentUserId={currentUserId}
        />
      )}
      {signed && signed.format !== "PDF" && target.location.kind === "html" && (
        <HtmlViewer
          documentId={target.documentId}
          location={target.location}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
