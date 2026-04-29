import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "../context/ConfigContext";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import ErrorBoundary from "../components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI App Generator — Build Full-Stack Apps from JSON",
  description: "Transform a single JSON configuration into a complete web application with authentication, dynamic APIs, beautiful UI, and a PostgreSQL database — instantly.",
  keywords: ["AI", "App Generator", "Full-Stack", "JSON", "Next.js", "PostgreSQL", "No-Code"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ConfigProvider>
            <LanguageProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </LanguageProvider>
          </ConfigProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
