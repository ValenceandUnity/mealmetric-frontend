import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DEFAULT_THEME, getThemeInitScript } from "@/lib/client/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "MealMetric",
  description: "MealMetric frontend and BFF foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <ThemeProvider>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
