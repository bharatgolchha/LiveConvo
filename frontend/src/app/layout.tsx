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
  title: "AI Sales Coach - Real-Time Meeting Assistant | liveprompt",
  description: "Close 35% more deals with AI-powered real-time conversation coaching. Works with Zoom, Meet, Teams. Start free.",
  keywords: "AI sales coach, real-time meeting assistant, conversation intelligence, live transcription, AI meeting notes, sales call coaching, interview assistant, zoom AI assistant, google meet AI, teams AI coach, sales enablement AI, recruiting AI tool, client success platform",
  authors: [{ name: "liveprompt.ai" }],
  creator: "InnoventuresAI Inc.",
  publisher: "InnoventuresAI Inc.",
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
    shortcut: '/favicon.ico',
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
    title: 'Turn Every Conversation into Conversion with AI | liveprompt',
    description:
      'Your AI teammate joins meetings, remembers everything, and delivers perfect responses in real-time. Close 35% more deals. Start free.',
    url: 'https://liveprompt.ai/',
    siteName: 'liveprompt.ai',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'liveprompt.ai - Turn conversations into conversions with AI-powered real-time coaching',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Sales Coach - Real-Time Meeting Assistant | liveprompt',
    description:
      'Join 500+ sales leaders using AI to close 35% more deals. Real-time coaching, perfect responses, instant summaries. Start free.',
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
      <head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#0B3D2E" />
        <meta name="theme-color" content="#0B3D2E" />
      </head>
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
      
      {/* Referral Code Capture Script */}
      <Script id="referral-capture" strategy="afterInteractive">{`
        (function() {
          const urlParams = new URLSearchParams(window.location.search);
          const refCode = urlParams.get('ref');
          if (refCode) {
            // Validate referral code format (alphanumeric, 6-10 chars)
            const cleanCode = refCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            if (cleanCode.length >= 6 && cleanCode.length <= 10) {
              // Only update if different from existing code
              const existingCode = localStorage.getItem('ref_code');
              if (!existingCode || existingCode !== cleanCode) {
                localStorage.setItem('ref_code', cleanCode);
                localStorage.setItem('ref_timestamp', Date.now());
                // Track event if analytics available
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'referral_link_clicked', {
                    referral_code: cleanCode
                  });
                }
              }
            }
          } else {
            // Check and clean up expired referral codes (30 days)
            const storedTimestamp = localStorage.getItem('ref_timestamp');
            if (storedTimestamp && Date.now() - parseInt(storedTimestamp) > 30 * 24 * 60 * 60 * 1000) {
              localStorage.removeItem('ref_code');
              localStorage.removeItem('ref_timestamp');
            }
          }
        })();
      `}</Script>
      {/* End Referral Code Capture */}
      
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
