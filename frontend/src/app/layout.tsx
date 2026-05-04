import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "../context/ConfigContext";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import ErrorBoundary from "../components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Compensation Intelligence | Discover Tech Salaries",
  description: "A production-grade compensation intelligence engine mapping tech salaries across standard levels.",
  keywords: ["Salary", "Compensation", "Tech", "Levels", "Software Engineer"],
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
