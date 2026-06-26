"use client";

import type { DocumentFormat } from "@prisma/client";
import { useCallback, useEffect, useReducer } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { HtmlViewer } from "@/components/viewer/html-viewer";
import { PdfViewer } from "@/components/viewer/pdf-viewer";
import { ViewerHeader, ViewerHeaderSkeleton } from "@/components/viewer/viewer-header";
import { useViewer, type ViewerTarget } from "@/components/viewer/viewer-state";
import {
  ViewerFailed,
  ViewerLoading,
  ViewerNotFound,
  ViewerUnsupported,
} from "@/components/viewer/viewer-states";
import { useIsMobile } from "@/hooks/use-mobile";

interface UrlResponse {
  url: string;
  format: DocumentFormat;
  name: string;
}

type Status = "loading" | "ready" | "not-found" | "error";

interface State {
  status: Status;
  signed: UrlResponse | null;
}

type Action =
  | { type: "reset" }
  | { type: "loaded"; signed: UrlResponse }
  | { type: "notFound" }
  | { type: "error" };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { status: "loading", signed: null };
    case "loaded":
      return { status: "ready", signed: action.signed };
    case "notFound":
      return { status: "not-found", signed: null };
    case "error":
      return { status: "error", signed: null };
  }
}

export function DocumentViewer({ currentUserId }: { currentUserId: string }) {
  const { target, close } = useViewer();
  const isMobile = useIsMobile();
  const [state, dispatch] = useReducer(reducer, { status: "loading", signed: null });
  const { status, signed } = state;
  const documentId = target?.documentId;

  const load = useCallback(async (id: string, isCancelled: () => boolean) => {
    dispatch({ type: "reset" });
    try {
      const res = await fetch(`/api/documents/${id}/url`);
      if (res.status === 404) {
        if (!isCancelled()) dispatch({ type: "notFound" });
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = (await res.json()) as UrlResponse;
      if (!isCancelled()) dispatch({ type: "loaded", signed: data });
    } catch {
      if (!isCancelled()) dispatch({ type: "error" });
    }
  }, []);

  useEffect(() => {
    if (!documentId) {
      dispatch({ type: "reset" });
      return;
    }
    let cancelled = false;
    void load(documentId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [documentId, load]);

  if (!target) return null;

  const body = (
    <div className="bg-background flex h-full min-h-0 flex-col">
      {status === "loading" ? (
        <ViewerHeaderSkeleton isMobile={isMobile} onClose={close} />
      ) : (
        <ViewerHeader
          format={signed?.format ?? target.format}
          name={signed?.name ?? target.documentName}
          isMobile={isMobile}
          onClose={close}
        />
      )}

      {status === "loading" && <ViewerLoading />}
      {status === "not-found" && <ViewerNotFound onBack={close} />}
      {status === "error" && documentId && (
        <ViewerFailed onRetry={() => void load(documentId, () => false)} />
      )}
      {status === "ready" && signed && (
        <Rendered signed={signed} target={target} currentUserId={currentUserId} />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open onOpenChange={(o) => !o && close()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[100dvh] w-full gap-0 p-0 sm:max-w-none"
        >
          <SheetTitle className="sr-only">{signed?.name ?? target.documentName}</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return body;
}

function Rendered({
  signed,
  target,
  currentUserId,
}: {
  signed: UrlResponse;
  target: ViewerTarget;
  currentUserId: string;
}) {
  if (signed.format === "PDF" && target.location.kind === "pdf") {
    return (
      <PdfViewer
        url={signed.url}
        documentId={target.documentId}
        location={target.location}
        currentUserId={currentUserId}
        displayIndex={target.displayIndex}
        quote={target.quote}
      />
    );
  }
  if (target.location.kind === "html") {
    return (
      <HtmlViewer
        documentId={target.documentId}
        location={target.location}
        currentUserId={currentUserId}
        downloadUrl={signed.url}
      />
    );
  }
  return <ViewerUnsupported downloadUrl={signed.url} />;
}
