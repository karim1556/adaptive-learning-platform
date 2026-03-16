import type React from "react"
import type { Metadata } from "next"
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
        url: "/placeholder-logo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/placeholder-logo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/placeholder-logo.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
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
