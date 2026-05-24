declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type InviteId = Brand<string, "InviteId">;

export const asOrgId = (id: string): OrgId => id as OrgId;
export const asUserId = (id: string): UserId => id as UserId;
export const asMembershipId = (id: string): MembershipId => id as MembershipId;
export const asInviteId = (id: string): InviteId => id as InviteId;
