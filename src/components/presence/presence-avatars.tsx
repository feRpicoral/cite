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

export function PresenceAvatars({ channel, me }: PresenceAvatarsProps) {
  const present = usePresence(channel, me);
  const visible = present.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, present.length - MAX_VISIBLE);

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u) => (
        <Tooltip key={u.userId}>
          <TooltipTrigger asChild>
            <Avatar
              className={cn(
                "ring-background h-6 w-6 ring-2",
                u.userId === me.userId && "ring-primary/50",
              )}
            >
              <AvatarFallback className="text-[10px]">{initialsFor(u)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{u.name ?? u.email}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Avatar className="ring-background bg-muted h-6 w-6 ring-2">
          <AvatarFallback className="text-[10px]">+{overflow}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function initialsFor(u: PresenceUser): string {
  const source = u.name ?? u.email;
  return source
    .split(/[\s.@]+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
