import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

/**
 * Returns `true` after the component has mounted on the client, `false`
 * during SSR and the initial render. Use to guard browser-only state that
 * would otherwise produce a hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
