import { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import "../styles/globals.css";
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { NavigationProvider } from '../context/NavigationContext';
import { Toaster } from '../components/ui/Toast';
import { Analytics } from '../lib/analytics';

// Load Inter font (primary font) with Latin subset
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Load JetBrains Mono (monospace font for code) with Latin subset
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

/**
 * Generates metadata for the application including SEO information,
 * viewport settings, and theme color configuration
 */
export function generateMetadata(): Metadata {
  return {
    title: {
      template: '%s | Engagerr',
      default: 'Engagerr - Content Relationship Analytics Platform',
    },
    description: 'Engagerr helps content creators track cross-platform performance with unified analytics and connects brands with creators through data-driven partnerships.',
    keywords: ['creator economy', 'content analytics', 'influencer marketing', 'brand partnerships', 'content performance', 'analytics platform'],
    authors: [{ name: 'Engagerr Team' }],
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#2563EB' },
      { media: '(prefers-color-scheme: dark)', color: '#1E40AF' },
    ],
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
    },
  };
}

/**
 * Root layout component that wraps all pages in the application
 * Provides global context providers, styling, and structure
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        {/* Theme provider for light/dark mode */}
        <ThemeProvider>
          {/* Toast notifications provider */}
          <ToastProvider position="bottom-right">
            {/* Authentication context provider */}
            <AuthProvider>
              {/* Navigation state provider */}
              <NavigationProvider>
                {/* Main content area */}
                <main className="min-h-screen">
                  {children}
                </main>
                {/* Toast notification display component */}
                <Toaster />
                {/* Analytics tracking component */}
                <Analytics />
              </NavigationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}