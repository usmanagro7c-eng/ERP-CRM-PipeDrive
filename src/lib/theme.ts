/**
 * Light/dark theme handling.
 *
 * The choice is stored in `localStorage` under the same `agrocrm.` prefix the
 * other view preferences use, and applied to `<html class="dark">` before the
 * first paint (see `src/routes/__root.tsx`) so a reload never flashes the wrong
 * theme.
 */

export const THEME_STORAGE_KEY = "agrocrm.theme";

export type Theme = "light" | "dark";

/** The theme the user picked, or `null` when they never picked one. */
export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for
    // the current page.
  }
}

/** Toggle the `dark` class on the document element. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Flip between light and dark and remember the result. */
export function toggleTheme(): Theme {
  const next: Theme =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
  applyTheme(next);
  storeTheme(next);
  return next;
}

/**
 * Script injected in `<head>` so the theme is correct before the first paint.
 * Kept as a string so it can run before React hydrates.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"){document.documentElement.classList.add("dark");}else if(t==="light"){document.documentElement.classList.remove("dark");}}catch(e){}`;
