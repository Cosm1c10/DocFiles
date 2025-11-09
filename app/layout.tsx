import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Patient Portal - Healthcare',
  description: 'AI-powered patient portal with personalized health tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
