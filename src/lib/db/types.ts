declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type InviteId = Brand<string, "InviteId">;
export type CollectionId = Brand<string, "CollectionId">;
export type DocumentId = Brand<string, "DocumentId">;
export type DocumentPartId = Brand<string, "DocumentPartId">;
export type ChunkId = Brand<string, "ChunkId">;
export type EmbeddingId = Brand<string, "EmbeddingId">;

export const asOrgId = (id: string): OrgId => id as OrgId;
export const asUserId = (id: string): UserId => id as UserId;
export const asMembershipId = (id: string): MembershipId => id as MembershipId;
export const asInviteId = (id: string): InviteId => id as InviteId;
export const asCollectionId = (id: string): CollectionId => id as CollectionId;
export const asDocumentId = (id: string): DocumentId => id as DocumentId;
export const asDocumentPartId = (id: string): DocumentPartId => id as DocumentPartId;
export const asChunkId = (id: string): ChunkId => id as ChunkId;
export const asEmbeddingId = (id: string): EmbeddingId => id as EmbeddingId;
