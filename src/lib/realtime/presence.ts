"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface PresenceUser {
  userId: string;
  name: string | null;
  email: string;
}

/**
 * Joins a Supabase Realtime presence channel and returns the list of users
 * currently present. The local user is included.
 *
 * The channel name is the caller's responsibility — typically the
 * conversation or document id, e.g. `presence:conversation:${id}`.
 */
export function usePresence(channelName: string, me: PresenceUser): PresenceUser[] {
  const [present, setPresent] = useState<PresenceUser[]>([me]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: { presence: { key: me.userId } },
    });

    const refresh = () => {
      const state = channel.presenceState<PresenceUser>();
      const users: PresenceUser[] = [];
      for (const list of Object.values(state)) {
        for (const entry of list) users.push(entry);
      }
      setPresent(users.length > 0 ? users : [me]);
    };

    channel
      .on("presence", { event: "sync" }, refresh)
      .on("presence", { event: "join" }, refresh)
      .on("presence", { event: "leave" }, refresh)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(me);
        }
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [channelName, me]);

  return present;
}
