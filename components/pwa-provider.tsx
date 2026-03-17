"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, RefreshCw, Share2, ShieldAlert, Smartphone, X } from "lucide-react"
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

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_LESSON_PROGRESS") {
        flushPendingProgressSync().catch((error) => {
          console.warn("Background sync flush failed:", error)
        })
      }
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
    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)

    return () => {
      cancelled = true
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage)
    }
  }, [])

  const banner = useMemo(() => {
    if (isInstalled || dismissed) return null

    if (!isSecure) {
      return {
        eyebrow: "Secure Context Required",
        title: "Install is blocked on this connection",
        description: "Phones will not install this app from plain local-network HTTP. Open the app on HTTPS to enable Add to Home Screen.",
        steps: ["Use an HTTPS URL on your phone.", "Refresh once the secure version loads."],
        canInstall: false,
        variant: "warning" as const,
        icon: ShieldAlert,
        helperAction: "hide" as const,
      }
    }

    if (installPrompt) {
      return {
        eyebrow: "Ready to Install",
        title: "Add AdaptIQ to your phone",
        description: "Install the app for a full-screen classroom experience with cached lessons and a faster return flow.",
        steps: ["Tap Install App below.", "Launch from your home screen like a native app."],
        canInstall: true,
        variant: "ready" as const,
        icon: Download,
        helperAction: "hide" as const,
      }
    }

    if (isIos) {
      return {
        eyebrow: "iPhone Install",
        title: "Use Safari to add this app",
        description: "iPhone does not show a browser install prompt here. Open this page in Safari and add it from the Share menu.",
        steps: ["Tap the Share icon in Safari.", "Choose Add to Home Screen."],
        canInstall: false,
        variant: "info" as const,
        icon: Share2,
        helperAction: "hide" as const,
      }
    }

    return {
      eyebrow: "Checking Installability",
      title: "Install prompt is not ready yet",
      description: "The service worker and manifest are loaded. Refresh once or browse a little more if the browser has not exposed the install event yet.",
      steps: ["Wait a moment for the browser install check.", "Tap Refresh Check if needed."],
      canInstall: false,
      variant: "neutral" as const,
      icon: Smartphone,
      helperAction: "refresh" as const,
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

  const refreshPage = () => {
    window.location.reload()
  }

  if (!banner) return null

  const tone =
    banner.variant === "ready"
      ? {
          shell: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(255,255,255,0.98))]",
          iconWrap: "bg-emerald-500 text-white shadow-[0_12px_24px_-12px_rgba(16,185,129,0.7)]",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          primary: "bg-emerald-600 hover:bg-emerald-700",
          secondary: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
        }
      : banner.variant === "warning"
        ? {
            shell: "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))]",
            iconWrap: "bg-amber-500 text-white shadow-[0_12px_24px_-12px_rgba(245,158,11,0.7)]",
            badge: "bg-amber-100 text-amber-900 border-amber-200",
            primary: "bg-slate-900 hover:bg-slate-800",
            secondary: "border-amber-200 text-amber-900 hover:bg-amber-50",
          }
        : banner.variant === "info"
          ? {
              shell: "border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,248,255,0.98),rgba(255,255,255,0.98))]",
              iconWrap: "bg-sky-500 text-white shadow-[0_12px_24px_-12px_rgba(14,165,233,0.7)]",
              badge: "bg-sky-100 text-sky-800 border-sky-200",
              primary: "bg-sky-600 hover:bg-sky-700",
              secondary: "border-sky-200 text-sky-800 hover:bg-sky-50",
            }
          : {
              shell: "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))]",
              iconWrap: "bg-slate-900 text-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.65)]",
              badge: "bg-slate-100 text-slate-700 border-slate-200",
              primary: "bg-blue-600 hover:bg-blue-700",
              secondary: "border-slate-200 text-slate-700 hover:bg-slate-50",
            }

  const BannerIcon = banner.icon

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 sm:px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div
        className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-t-[30px] rounded-b-[26px] border p-4 shadow-[0_26px_60px_-28px_rgba(15,23,42,0.4)] backdrop-blur xl:max-w-lg ${tone.shell}`}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200/80" />

        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.iconWrap}`}>
            <BannerIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.badge}`}>
              {banner.eyebrow}
            </div>
            <h3 className="mt-2 text-[1.05rem] font-semibold leading-6 text-slate-950">{banner.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{banner.description}</p>
          </div>

          <button
            type="button"
            onClick={dismissBanner}
            className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {banner.steps.map((step, index) => (
            <div
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {banner.canInstall ? (
            <button
              type="button"
              onClick={triggerInstall}
              className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${tone.primary}`}
            >
              <Download className="mr-2 h-4 w-4" />
              Install App
            </button>
          ) : banner.helperAction === "refresh" ? (
            <button
              type="button"
              onClick={refreshPage}
              className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${tone.primary}`}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Check
            </button>
          ) : null}

          <button
            type="button"
            onClick={dismissBanner}
            className={`inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition sm:min-w-[132px] ${tone.secondary}`}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

export default PwaProvider
