"use client";

import type { DocumentStatus } from "@prisma/client";
import { useEffect, useState } from "react";

import type { DocumentRow } from "./documents-pane";

const POLL_INTERVAL_MS = 2500;

const STATUS_RANK: Record<DocumentStatus, number> = {
  UPLOADING: 0,
  EXTRACTING: 1,
  CHUNKING: 2,
  EMBEDDING: 3,
  INDEXED: 4,
  FAILED: 4,
};

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
 * The server stays the source of truth for which rows exist; this overlay only
 * advances a row's status. An overlay is applied only when it ranks ahead of
 * the server value, so a later server render (e.g. after `router.refresh()`)
 * always wins once it catches up, and stale overlays never pin a row back.
 */
export function useDocumentStatus(collectionId: string, documents: DocumentRow[]): DocumentRow[] {
  const [updates, setUpdates] = useState<Map<string, DocumentStatusUpdate>>(new Map());

  const merged = documents.map((doc) => {
    const update = updates.get(doc.id);
    if (!update || STATUS_RANK[update.status] <= STATUS_RANK[doc.status]) return doc;
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
