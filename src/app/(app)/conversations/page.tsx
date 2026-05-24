import { MessagesSquare } from "lucide-react";
import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { NewConversationButton } from "./new-conversation-button";

export default async function ConversationsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);

  const [conversations, collections] = await Promise.all([
    db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        collection: { select: { name: true } },
      },
    }),
    db.collection.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground text-xs">{conversations.length} total</p>
        </div>
        <NewConversationButton collections={collections} />
      </header>
      <div className="flex flex-1 flex-col">
        {conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
            <MessagesSquare className="text-muted-foreground h-10 w-10" />
            <div>
              <h2 className="text-base font-medium">No conversations yet</h2>
              <p className="text-muted-foreground text-sm">
                Start a conversation in any collection to begin asking questions.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/conversations/${c.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between px-6 py-3 text-sm transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.collection.name} · {formatDate(c.updatedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

function formatDate(d: Date): string {
  return DATE_FORMAT.format(d);
}
