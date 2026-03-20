import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MealMetric",
  description: "MealMetric frontend and BFF foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ marginBottom: 8 }}>MealMetric</h1>
            <p style={{ margin: 0, color: "#94a3b8" }}>
              Next.js App Router foundation with integrated BFF routes.
            </p>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/login">Login</Link>
              <Link href="/client">Client Dashboard</Link>
              <Link href="/pt">PT Dashboard</Link>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}