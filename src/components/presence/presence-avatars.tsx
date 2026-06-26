"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type PresenceUser, usePresence } from "@/lib/realtime/presence";
import { cn } from "@/lib/utils";

interface PresenceAvatarsProps {
  channel: string;
  me: PresenceUser;
}

const MAX_VISIBLE = 4;

const AVATAR_COLORS = [
  "oklch(0.70 0.09 145)",
  "oklch(0.68 0.10 35)",
  "oklch(0.66 0.10 285)",
  "oklch(0.72 0.10 70)",
  "oklch(0.66 0.09 195)",
];

export function PresenceAvatars({ channel, me }: PresenceAvatarsProps) {
  const present = usePresence(channel, me);
  const visible = present.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, present.length - MAX_VISIBLE);

  return (
    <div className="flex items-center -space-x-2.5">
      {visible.map((u) => (
        <Tooltip key={u.userId}>
          <TooltipTrigger asChild>
            <Avatar
              className={cn(
                "ring-background size-[30px] text-white ring-2",
                u.userId === me.userId &&
                  "ring-primary ring-offset-background z-10 ring-2 ring-offset-2",
              )}
            >
              <AvatarFallback
                className="text-[11px] font-semibold text-white"
                style={{ backgroundColor: colorFor(u.userId) }}
              >
                {initialsFor(u)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {u.name ?? "Member"}
              {u.userId === me.userId && " (you)"}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Avatar className="ring-background bg-muted size-[30px] ring-2">
          <AvatarFallback className="bg-muted text-muted-foreground text-[11px] font-semibold">
            +{overflow}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function colorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function initialsFor(u: PresenceUser): string {
  const source = u.name ?? u.userId;
  return source
    .split(/[\s.@-]+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
