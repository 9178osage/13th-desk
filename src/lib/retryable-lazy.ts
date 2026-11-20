import { lazy, useState, type ComponentType } from "react";

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

/**
 * `React.lazy` keeps a rejected import forever, so "try again" (see LoadBoundary) needs a
 * fresh lazy component that imports again. Returns the component and that retry.
 */
export function useRetryableLazy<P>(load: Loader<P>) {
  const [Loaded, setLoaded] = useState(() => lazy(load));
  // The updater form: a component is a function, so it must not be passed directly.
  return [Loaded, () => setLoaded(() => lazy(load))] as const;
}
