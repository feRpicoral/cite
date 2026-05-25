/**
 * Discriminated union used as the return type of server actions that need
 * to surface a user-visible error without throwing. Two shapes:
 *  - `Result<T>`: action returns data on success.
 *  - `Result`:    action just signals ok/error.
 */
export type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };
