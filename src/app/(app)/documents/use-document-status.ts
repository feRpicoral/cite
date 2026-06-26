"use client";

import type { DocumentStatus } from "@prisma/client";
import { useEffect, useState } from "react";

import type { DocumentRow } from "./documents-pane";

const POLL_INTERVAL_MS = 2500;

function isTerminal(status: DocumentStatus): boolean {
  return status === "INDEXED" || status === "FAILED";
}

interface DocumentStatusUpdate {
  id: string;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number | null;
}

function hasPending(documents: DocumentRow[]): boolean {
  return documents.some((doc) => !isTerminal(doc.status));
}

/**
 * Keeps the server-rendered document list's ingestion state fresh without a
 * page reload. Polls a lightweight status endpoint while any visible document
 * is still ingesting and stops once every document reaches a terminal status.
 *
 * The server stays the source of truth for which rows exist; the latest poll
 * overlays each row's status. A new server render (`router.refresh()`, e.g.
 * after an upload or a retry) is at least as fresh as any earlier poll, so its
 * overlays are discarded — otherwise a stale terminal overlay (e.g. FAILED)
 * could pin a row the server has since reset back to UPLOADING on retry, and
 * polling would never resume because the pinned status looks terminal.
 */
export function useDocumentStatus(collectionId: string, documents: DocumentRow[]): DocumentRow[] {
  const [serverDocuments, setServerDocuments] = useState(documents);
  const [updates, setUpdates] = useState<Map<string, DocumentStatusUpdate>>(new Map());

  if (documents !== serverDocuments) {
    setServerDocuments(documents);
    setUpdates(new Map());
  }

  const merged = documents.map((doc) => {
    const update = updates.get(doc.id);
    if (!update) return doc;
    return {
      ...doc,
      status: update.status,
      errorMessage: update.errorMessage,
      pageCount: update.pageCount,
    };
  });

  const shouldPoll = hasPending(merged);

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/documents/status?collectionId=${encodeURIComponent(collectionId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data: { documents: DocumentStatusUpdate[] } = await res.json();
        if (cancelled) return;

        setUpdates(new Map(data.documents.map((update) => [update.id, update])));
      } catch {
        // Transient network failures are non-fatal; the next tick retries.
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [shouldPoll, collectionId]);

  return merged;
}
