import { Sora, Space_Grotesk } from 'next/font/google';
import "./globals.css";
import ClientShell from "../components/ClientShell";

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata = {
  title: "Dropamyn — Discover What's Dropping Next",
  description: "The ultimate destination for product launches. Discover upcoming sneaker drops, tech launches, creator merch, and limited edition releases.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${spaceGrotesk.variable}`} style={{ fontFamily: "var(--font-space-grotesk), -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <ClientShell
          fallback={
            <main style={{ minHeight: '100vh', paddingBottom: '60px' }} />
          }
        >
          {/* Main content — offset by sidebar on desktop, full-width on mobile */}
          <main style={{ minHeight: '100vh', paddingBottom: '60px' }}>
            {children}
          </main>
        </ClientShell>
      </body>
    </html>
  );
}
