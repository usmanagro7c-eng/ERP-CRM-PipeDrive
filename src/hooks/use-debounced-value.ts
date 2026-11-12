import { useEffect, useState } from "react";

/**
 * Debounce a value so it only settles after the user stops typing.
 *
 * Used by the list pages to search while typing instead of waiting for the
 * Enter key.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
