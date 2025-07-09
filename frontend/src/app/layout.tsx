import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { Toaster } from "sonner";
import Script from "next/script";
import IntercomProvider from '@/components/IntercomProvider';

// Suppress React DevTools warning in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {
    supportsFiber: true,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  };
}

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
  metadataBase: new URL('https://liveprompt.ai'),
  title: "liveprompt.ai - AI-Powered Real-Time Conversation Intelligence | Sales Coaching & Meeting Assistant",
  description: "Get instant AI guidance during sales calls, interviews, and client meetings. Real-time coaching, automated summaries, and actionable insights. Works with Zoom, Google Meet, Teams. Try free for 14 days.",
  keywords: "AI conversation intelligence, real-time sales coaching, meeting assistant, AI call assistant, sales enablement software, conversation analytics, interview assistant, automated meeting notes, CRM integration, objection handling AI",
  authors: [{ name: "liveprompt.ai" }],
  creator: "NexGenAI LLC",
  publisher: "NexGenAI LLC",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon-48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#0B3D2E',
      },
    ],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LivePrompt',
  },
  alternates: {
    canonical: 'https://liveprompt.ai/',
  },
  openGraph: {
    title: 'liveprompt.ai - AI-Powered Real-Time Conversation Intelligence',
    description:
      'Get instant AI guidance during sales calls, interviews, and meetings. Real-time coaching that helps you close more deals. Works with Zoom, Google Meet, Teams. Try free.',
    url: 'https://liveprompt.ai/',
    siteName: 'liveprompt.ai',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai - AI conversation intelligence platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'liveprompt.ai - AI-Powered Conversation Intelligence',
    description:
      'Real-time AI coaching for sales calls & meetings. Get instant guidance, automated summaries, and close more deals. Try free for 14 days.',
    creator: '@livepromptai',
    site: '@livepromptai',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Google Analytics 4 */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-YYPP67HS2H"
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-YYPP67HS2H');
      `}</Script>
      {/* End Google Analytics 4 */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <AuthErrorBoundary>
          <ThemeProvider defaultTheme="dark" storageKey="liveprompt-theme">
            <AuthProvider>
              {children}
              <IntercomProvider />
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
