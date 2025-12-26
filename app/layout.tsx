import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PayLog - Invoice Management System",
  description: "Internal invoice tracking and payment management",
};

// Inline script to prevent theme flash (FOUC)
// Runs before React hydration to set theme class on <html>
const themeScript = `
  (function() {
    try {
      // Handle dark/light theme
      var theme = localStorage.getItem('theme');
      var isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Handle sidebar collapsed state
      var uiStore = localStorage.getItem('paylog-ui-preferences');
      if (uiStore) {
        var parsed = JSON.parse(uiStore);
        var isCollapsed = parsed.state && parsed.state.sidebarCollapsedV3;
        if (isCollapsed) {
          document.documentElement.classList.add('sidebar-collapsed');
        }
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${inter.className}`}>
        <ThemeProvider attribute="class">
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
