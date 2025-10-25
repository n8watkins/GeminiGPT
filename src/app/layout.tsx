import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "@/contexts/ChatContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Providers } from "@/components/Providers";
import DebugPanel from "@/components/DebugPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WebVitals } from "@/components/WebVitals";
import { WebVitalsHUD } from "@/components/WebVitalsHUD";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeminiGPT - AI Chat Assistant",
  description: "A powerful AI chat assistant powered by Google's Gemini AI with advanced features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CRITICAL SECURITY NOTE: This inline script prevents theme flash (FOUC)
            - Must run before DOM paint to prevent flicker
            - Safe because: no user input interpolation, only classList manipulation
            - Theme value is validated against whitelist before use
            - Wrapped in try-catch for error safety
            - Cannot use external script (would cause FOUC)
            - Cannot use React component (would run after paint) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // CRITICAL SECURITY: Validate theme value against whitelist
                const rawTheme = localStorage.getItem('theme');
                const validThemes = ['light', 'dark', 'system'];
                const theme = validThemes.includes(rawTheme) ? rawTheme : 'system';

                // Safe: only uses validated theme value for logic, never injects into DOM
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                // Silently fail - theme will be set by ThemeContext on mount
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ErrorBoundary>
            <NotificationProvider>
              <ChatProvider>
                {children}
                <DebugPanel />
              </ChatProvider>
            </NotificationProvider>
          </ErrorBoundary>
          <WebVitals />
          <WebVitalsHUD />
        </Providers>
      </body>
    </html>
  );
}
