"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DocumentViewer } from "@/components/viewer/document-viewer";
import { useViewer, ViewerProvider } from "@/components/viewer/viewer-state";

import { ChatPanel, type InitialMessage } from "./chat-panel";

interface ConversationLayoutProps {
  conversationId: string;
  title: string;
  collectionName: string;
  initialMessages: InitialMessage[];
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
}: ConversationLayoutProps) {
  const { target } = useViewer();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b px-6 py-3">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        <p className="text-muted-foreground text-xs">{collectionName}</p>
      </header>
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={target ? 50 : 100} minSize={30}>
          <ChatPanel
            conversationId={conversationId}
            initialMessages={initialMessages}
            collectionName={collectionName}
          />
        </ResizablePanel>
        {target && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <DocumentViewer />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
