import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { Toaster } from "sonner";
import { BrowserCompatibilityNotice } from "@/components/ui/BrowserCompatibilityNotice";
import Script from "next/script";

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
  icons: {
    icon: [
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
        url: '/favicon.ico',
        sizes: 'any',
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
        url: '/apple-touch-icon.png',
        color: '#000000',
      },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LivePrompt',
  },
  alternates: {
    canonical: 'https://liveprompt.ai/',
  },
  openGraph: {
    title: 'liveprompt.ai - Real-time Conversation Intelligence',
    description:
      'Transform your conversations with AI-powered real-time guidance and intelligent summaries',
    url: 'https://liveprompt.ai/',
    siteName: 'liveprompt.ai',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'liveprompt.ai - Real-time Conversation Intelligence',
    description:
      'Transform your conversations with AI-powered real-time guidance and intelligent summaries',
    creator: '@livepromptai',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Google Tag Manager */}
      <Script id="gtm-head" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W2LMBSMZ');
`}</Script>
      {/* End Google Tag Manager */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W2LMBSMZ" height="0" width="0" style="display:none;visibility:hidden"></iframe>',
          }}
        />
        {/* End Google Tag Manager (noscript) */}
        <AuthErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="liveprompt-theme">
            <AuthProvider>
              <BrowserCompatibilityNotice />
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
