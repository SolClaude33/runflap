import './globals.css'
import type { Metadata } from 'next'
import { Titillium_Web } from 'next/font/google'
import { Providers } from './components/Providers'

const titillium = Titillium_Web({ subsets: ['latin'], weight:'400' })

export const metadata: Metadata = {
  title: 'FlapRace | BNB Racing Game',
  description: "The most thrilling racing experience on BNB! Bet BNB on your favorite car and win big. Powered by BNB Smart Chain.",
  metadataBase: new URL('https://flaprace.com'),
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo-new.png',
  },
  openGraph: {
    title: 'FlapRace',
    description: "The most thrilling racing experience on BNB! Bet BNB on your favorite car and win big.",
    url: 'https://flaprace.com',
    siteName: 'FlapRace',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FlapRace - BNB Racing Game',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlapRace',
    description: "The most thrilling racing experience on BNB! Bet BNB on your favorite car and win big.",
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={titillium.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
