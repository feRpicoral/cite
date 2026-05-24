import { FileText, FolderPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { CreateCollectionForm } from "./create-collection-form";
import { DocumentList } from "./document-list";

interface DocumentsPageProps {
  searchParams: Promise<{ collection?: string }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const { collection: selectedId } = await searchParams;
  const session = await requireSession();
  const t = await getTranslations("app");
  const db = getDb(session.orgId);

  const collections = await db.collection.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, _count: { select: { documents: true } } },
  });

  const active = collections.find((c) => c.id === selectedId) ?? collections[0] ?? null;

  return (
    <div className="grid flex-1 grid-cols-[260px_1fr] divide-x">
      <aside className="flex flex-col gap-1 p-4">
        <div className="text-muted-foreground flex items-center justify-between px-2 pb-1 text-xs font-medium tracking-wide uppercase">
          <span>{t("nav.documents")}</span>
          <CreateCollectionForm />
        </div>
        {collections.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-sm">No collections yet.</p>
        ) : (
          collections.map((c) => {
            const isActive = active?.id === c.id;
            return (
              <a
                key={c.id}
                href={`/documents?collection=${c.id}`}
                className={`hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${isActive ? "bg-muted font-medium" : ""}`}
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-muted-foreground text-xs">{c._count.documents}</span>
              </a>
            );
          })
        )}
      </aside>
      <section className="flex flex-col">
        {active ? (
          <DocumentList collectionId={active.id} collectionName={active.name} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
            <FolderPlus className="text-muted-foreground h-10 w-10" />
            <div className="space-y-1">
              <h2 className="text-base font-medium">No collection selected</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                Create a collection to start uploading documents.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
