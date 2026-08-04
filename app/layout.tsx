import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Geist } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
})

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'Control Balance · Estudio de Pilates Reformer',
  description:
    'Respira. Conecta. Transforma. Un estudio boutique de Pilates Reformer donde el movimiento consciente se encuentra con el lujo silencioso.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  // AGREGAR ESTO: Metadatos Premium para WhatsApp, iMessage y Facebook
  openGraph: {
    title: 'Control Balance | Estudio de Pilates Reformer',
    description: 'Respira. Conecta. Transforma. Reserva tu clase en nuestro estudio boutique en Monterrey.',
    url: 'https://control-balance-pilates.vercel.app/', // Aquí va el link real de tu página
    siteName: 'Control Balance',
    images: [
      {
        url: 'https://control-balance-pilates.vercel.app/images/fondo.jpeg', // Usamos tu imagen de fondo
        width: 1200,
        height: 630,
        alt: 'Control Balance Pilates Studio',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  manifest: '/manifest.json', // <-- ESTA ES LA LÍNEA NUEVA MAGICA
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5efe6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${geistSans.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
