import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "liveprompt.ai - Real-time Conversation Intelligence",
  description: "Transform your conversations with AI-powered real-time guidance and intelligent summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <AuthErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="liveprompt-theme">
            <AuthProvider>
              {children}
              <Toaster 
                position="top-right"
                toastOptions={{
                  classNames: {
                    toast: 'bg-background border-border',
                    title: 'text-foreground',
                    description: 'text-muted-foreground',
                    actionButton: 'bg-primary text-primary-foreground',
                    cancelButton: 'bg-muted text-muted-foreground',
                  }
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  );
}
