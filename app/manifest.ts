import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AdaptIQ AMEP",
    short_name: "AdaptIQ",
    description: "Adaptive Mastery & Engagement Platform with offline-ready lessons and quizzes.",
    id: "/",
    start_url: "/student/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    orientation: "portrait",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  }
}
