import { useEffect, useRef } from "react";

/**
 * Returns a ref that always holds the latest value.
 * Useful for keeping stable callback references that read the latest state
 * without re-registering event listeners or effects.
 *
 * The ref is updated in a layout-phase effect (not during render) to satisfy
 * React Compiler's rule against accessing refs during render.
 *
 * @see advanced-use-latest (Vercel React Best Practices)
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}
