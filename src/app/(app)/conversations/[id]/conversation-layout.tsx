"use client";

import { Folder } from "lucide-react";

import { PresenceAvatars } from "@/components/presence/presence-avatars";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DocumentViewer } from "@/components/viewer/document-viewer";
import { useViewer, ViewerProvider } from "@/components/viewer/viewer-state";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PresenceUser } from "@/lib/realtime/presence";

import { ChatPanel, type InitialMessage } from "./chat-panel";
import { ViewerSheet } from "./viewer-sheet";

interface ConversationLayoutProps {
  conversationId: string;
  title: string;
  collectionName: string;
  initialMessages: InitialMessage[];
  me: PresenceUser;
}

export function ConversationLayout(props: ConversationLayoutProps) {
  return (
    <ViewerProvider>
      <Inner {...props} />
    </ViewerProvider>
  );
}

function Inner({
  conversationId,
  title,
  collectionName,
  initialMessages,
  me,
}: ConversationLayoutProps) {
  const { target } = useViewer();
  const isMobile = useIsMobile();

  const chat = (
    <ChatPanel
      conversationId={conversationId}
      initialMessages={initialMessages}
      collectionName={collectionName}
      currentUserId={me.userId}
    />
  );

  return (
    // Pin to the viewport height so the chat and document panes each get their
    // own bounded scroll region; without a fixed height the panes' overflow
    // never clamps and the whole page scrolls (and PDF zoom grows the page).
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Folder className="size-3" strokeWidth={2.2} />
            <span className="truncate text-[11px] font-medium">{collectionName}</span>
          </div>
        </div>
        <PresenceAvatars channel={`presence:conversation:${conversationId}`} me={me} />
      </header>

      {isMobile ? (
        <>
          <div className="min-h-0 flex-1">{chat}</div>
          <ViewerSheet currentUserId={me.userId} />
        </>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={target ? 50 : 100} minSize={30}>
            {chat}
          </ResizablePanel>
          {target && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <DocumentViewer currentUserId={me.userId} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}
    </div>
  );
}
