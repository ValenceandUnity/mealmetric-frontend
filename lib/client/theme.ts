export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "mealmetric-theme";
export const DEFAULT_THEME: ThemeMode = "dark";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function getThemeInitScript(): string {
  return `(() => {
    try {
      const key = "${THEME_STORAGE_KEY}";
      const fallback = "${DEFAULT_THEME}";
      const stored = window.localStorage.getItem(key);
      const theme = stored === "light" || stored === "dark" ? stored : fallback;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "${DEFAULT_THEME}";
      document.documentElement.style.colorScheme = "${DEFAULT_THEME}";
    }
  })();`;
}
