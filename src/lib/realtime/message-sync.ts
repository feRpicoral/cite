"use client";

import { useEffect } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface MessageInsertPayload {
  id: string;
  conversation_id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  created_at: string;
}

/**
 * Subscribes to INSERTs on `public.messages` filtered by conversationId.
 * RLS scopes the stream to the caller's tenant (the JWT is forwarded by
 * the browser client's auth-state handler — see lib/supabase/browser.ts).
 *
 * Pairs with the local optimistic insert in ChatPanel so a second user
 * sees the first user's messages appear without a refresh.
 */
export function useMessageInserts(
  conversationId: string,
  onInsert: (m: MessageInsertPayload) => void,
): void {
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        // The Supabase typings for postgres_changes are looser than the
        // runtime contract; we narrow `payload.new` at the call site.
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        } as never,
        (payload: { new: MessageInsertPayload }) => {
          onInsert(payload.new);
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [conversationId, onInsert]);
}
