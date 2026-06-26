import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/cite/empty-state";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { CollectionsPane, type CollectionSummary } from "./collections-pane";
import { type DocumentRow, DocumentsPane } from "./documents-pane";
import { NoCollections } from "./empty-states";

interface DocumentsPageProps {
  searchParams: Promise<{ collection?: string }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const { collection: selectedId } = await searchParams;
  const session = await requireSession();
  const t = await getTranslations("documents");
  const db = getDb(session.orgId);

  const collectionRecords = await db.collection.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { documents: true } },
    },
  });

  const collections: CollectionSummary[] = collectionRecords.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    count: c._count.documents,
  }));

  if (collections.length === 0) {
    return <NoCollections />;
  }

  const active = collections.find((c) => c.id === selectedId) ?? null;

  let documents: DocumentRow[] = [];
  if (active) {
    documents = await db.document.findMany({
      where: { collectionId: active.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        format: true,
        status: true,
        sizeBytes: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row md:divide-x">
      <CollectionsPane collections={collections} activeId={active?.id ?? null} />
      {active ? (
        <DocumentsPane
          collectionId={active.id}
          collectionName={active.name}
          collectionDescription={active.description}
          documents={documents}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={<ArrowLeft />}
            title={t("empty.noSelectionTitle")}
            description={t("empty.noSelectionBody")}
          />
        </div>
      )}
    </div>
  );
}
