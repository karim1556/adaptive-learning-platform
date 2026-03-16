"use client"

import { useEffect } from "react"
import { flushPendingProgressSync } from "@/lib/lesson-service"

export function PwaProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    let cancelled = false

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        if (cancelled) return

        try {
          await flushPendingProgressSync()
        } catch (error) {
          console.warn("Initial PWA sync failed:", error)
        }

        if ("sync" in registration) {
          try {
            // Helps prompt a resync when connectivity returns on supported browsers.
            await (registration as ServiceWorkerRegistration & {
              sync?: { register: (tag: string) => Promise<void> }
            }).sync?.register?.("lesson-progress-sync")
          } catch (error) {
            console.warn("Background sync registration failed:", error)
          }
        }
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error)
      })

    const handleOnline = () => {
      flushPendingProgressSync().catch((error) => {
        console.warn("Online sync failed:", error)
      })
    }

    window.addEventListener("online", handleOnline)

    return () => {
      cancelled = true
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  return null
}

export default PwaProvider
