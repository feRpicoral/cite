-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('EN_US', 'PT_BR');

-- CreateEnum
CREATE TYPE "theme_preference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "document_format" AS ENUM ('PDF', 'DOCX', 'HTML', 'MD');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('UPLOADING', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "comment_target" AS ENUM ('MESSAGE', 'DOCUMENT_REGION');

-- CreateEnum
CREATE TYPE "citation_verdict" AS ENUM ('SUPPORTED', 'PARTIAL', 'UNSUPPORTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "locale" "locale" NOT NULL DEFAULT 'EN_US',
    "theme_preference" "theme_preference" NOT NULL DEFAULT 'SYSTEM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "role" "membership_role" NOT NULL DEFAULT 'MEMBER',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "format" "document_format" NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'UPLOADING',
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "page_count" INTEGER,
    "error_message" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "indexed_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_parts" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "contextual_preamble" TEXT,
    "token_count" INTEGER NOT NULL,
    "location" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embeddings" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "chunk_id" UUID NOT NULL,
    "embedding" halfvec(2048) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "agent_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_citations" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "chunk_id" UUID NOT NULL,
    "display_index" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "target_type" "comment_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "location" JSONB,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_replies" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_audits" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "display_index" INTEGER NOT NULL,
    "verdict" "citation_verdict" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "resolves" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_metrics" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "classify_ms" INTEGER,
    "retrieval_ms" INTEGER,
    "sufficiency_ms" INTEGER,
    "synthesis_ms" INTEGER,
    "total_ms" INTEGER NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "chunks_retrieved" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_org_id_user_id_key" ON "memberships"("org_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_org_id_idx" ON "invites"("org_id");

-- CreateIndex
CREATE INDEX "collections_org_id_idx" ON "collections"("org_id");

-- CreateIndex
CREATE INDEX "documents_org_id_status_idx" ON "documents"("org_id", "status");

-- CreateIndex
CREATE INDEX "documents_collection_id_idx" ON "documents"("collection_id");

-- CreateIndex
CREATE INDEX "document_parts_org_id_idx" ON "document_parts"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_parts_document_id_index_key" ON "document_parts"("document_id", "index");

-- CreateIndex
CREATE INDEX "document_chunks_org_id_idx" ON "document_chunks"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_document_id_index_key" ON "document_chunks"("document_id", "index");

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_chunk_id_key" ON "embeddings"("chunk_id");

-- CreateIndex
CREATE INDEX "embeddings_org_id_idx" ON "embeddings"("org_id");

-- CreateIndex
CREATE INDEX "conversations_org_id_collection_id_idx" ON "conversations"("org_id", "collection_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_org_id_idx" ON "messages"("org_id");

-- CreateIndex
CREATE INDEX "message_citations_org_id_idx" ON "message_citations"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_citations_message_id_display_index_key" ON "message_citations"("message_id", "display_index");

-- CreateIndex
CREATE INDEX "comments_org_id_target_type_target_id_idx" ON "comments"("org_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "comment_replies_comment_id_created_at_idx" ON "comment_replies"("comment_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_replies_org_id_idx" ON "comment_replies"("org_id");

-- CreateIndex
CREATE INDEX "citation_audits_org_id_idx" ON "citation_audits"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "citation_audits_message_id_display_index_key" ON "citation_audits"("message_id", "display_index");

-- CreateIndex
CREATE UNIQUE INDEX "message_metrics_message_id_key" ON "message_metrics"("message_id");

-- CreateIndex
CREATE INDEX "message_metrics_org_id_created_at_idx" ON "message_metrics"("org_id", "created_at");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_parts" ADD CONSTRAINT "document_parts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "document_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_citations" ADD CONSTRAINT "message_citations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_citations" ADD CONSTRAINT "message_citations_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

