"use client";

import { PresenceAvatars } from "@/components/presence/presence-avatars";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DocumentViewer } from "@/components/viewer/document-viewer";
import { useViewer, ViewerProvider } from "@/components/viewer/viewer-state";
import type { PresenceUser } from "@/lib/realtime/presence";

import { ChatPanel, type InitialMessage } from "./chat-panel";

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

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          <p className="text-muted-foreground text-xs">{collectionName}</p>
        </div>
        <PresenceAvatars channel={`presence:conversation:${conversationId}`} me={me} />
      </header>
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={target ? 50 : 100} minSize={30}>
          <ChatPanel
            conversationId={conversationId}
            initialMessages={initialMessages}
            collectionName={collectionName}
            currentUserId={me.userId}
          />
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
    </div>
  );
}
