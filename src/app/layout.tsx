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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
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
