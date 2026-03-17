"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, X } from "lucide-react"
import { flushPendingProgressSync } from "@/lib/lesson-service"

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISS_KEY = "adaptiq_pwa_install_dismissed_v1"

function isStandalone() {
  if (typeof window === "undefined") return false

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export function PwaProvider() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [isIos, setIsIos] = useState(false)
  const [isSecure, setIsSecure] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return

    setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
    setIsInstalled(isStandalone())
    setIsSecure(window.isSecureContext)

    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIos(/iphone|ipad|ipod/.test(userAgent))
  }, [])

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

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as DeferredInstallPrompt)
      setDismissed(false)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      cancelled = true
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const banner = useMemo(() => {
    if (isInstalled || dismissed) return null

    if (!isSecure) {
      return {
        title: "PWA install needs HTTPS",
        description: "Open this app on HTTPS or localhost. A phone opened on local network HTTP will not be installable.",
        canInstall: false,
      }
    }

    if (installPrompt) {
      return {
        title: "Install AdaptIQ",
        description: "Add the app to your home screen for a full-screen, offline-ready experience.",
        canInstall: true,
      }
    }

    if (isIos) {
      return {
        title: "Install on iPhone",
        description: "Open this page in Safari, tap Share, then choose Add to Home Screen.",
        canInstall: false,
      }
    }

    return {
      title: "App install will appear here",
      description: "If install is not available yet, check that you are using HTTPS and refresh once after the service worker registers.",
      canInstall: false,
    }
  }, [dismissed, installPrompt, isInstalled, isIos, isSecure])

  const dismissBanner = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, "1")
  }

  const triggerInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice.outcome === "accepted") {
      setInstallPrompt(null)
      setDismissed(true)
    }
  }

  if (!banner) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-md rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.45)] backdrop-blur">
      <button
        type="button"
        onClick={dismissBanner}
        className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss install banner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Download className="h-4 w-4 text-blue-600" />
          {banner.title}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{banner.description}</p>
      </div>

      {banner.canInstall ? (
        <button
          type="button"
          onClick={triggerInstall}
          className="mt-3 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Install App
        </button>
      ) : null}
    </div>
  )
}

export default PwaProvider
