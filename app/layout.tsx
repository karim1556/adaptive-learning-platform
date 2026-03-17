import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { PwaProvider } from "@/components/pwa-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "AdaptIQ - Adaptive Learning Platform",
  description: "Personalized adaptive learning with AI-assisted education",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/pwa-192.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/pwa-192.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/placeholder-logo.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AdaptIQ",
  },
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <PwaProvider />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
