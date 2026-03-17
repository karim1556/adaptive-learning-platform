"use client"

import Link from "next/link"
import { useMemo, useState, type ElementType } from "react"
import { ChevronRight, LogOut, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export interface RoleSidebarNavItem {
  name: string
  href: string
  icon: ElementType
  description?: string
}

interface RoleSidebarShellProps {
  pathname: string
  navItems: RoleSidebarNavItem[]
  homeHref: string
  brandTitle: string
  brandSubtitle: string
  brandIcon: ElementType
  action?: {
    href: string
    label: string
    icon: ElementType
  }
  accent: "blue" | "indigo" | "emerald" | "slate"
  onLogout: () => void | Promise<void>
  mobilePrimaryCount?: number
}

const ACCENT_STYLES = {
  blue: {
    brand: "bg-blue-600",
    action: "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30",
    active: "bg-blue-600 text-white shadow-lg shadow-blue-600/25",
    activeHint: "text-blue-100",
    activeChevron: "text-blue-200",
    mobileActive: "bg-blue-600/10 text-blue-700 dark:text-blue-300",
    mobileIcon: "text-blue-600 dark:text-blue-300",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  indigo: {
    brand: "bg-indigo-600",
    action: "bg-indigo-600 text-white hover:bg-indigo-700",
    active: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25",
    activeHint: "text-indigo-100",
    activeChevron: "text-indigo-200",
    mobileActive: "bg-indigo-600/10 text-indigo-700 dark:text-indigo-300",
    mobileIcon: "text-indigo-600 dark:text-indigo-300",
    pill: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  emerald: {
    brand: "bg-emerald-600",
    action: "bg-emerald-600 text-white hover:bg-emerald-700",
    active: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25",
    activeHint: "text-emerald-100",
    activeChevron: "text-emerald-200",
    mobileActive: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    mobileIcon: "text-emerald-600 dark:text-emerald-300",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  slate: {
    brand: "bg-slate-900 dark:bg-slate-700",
    action: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
    active: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-slate-100 dark:text-slate-900",
    activeHint: "text-slate-200 dark:text-slate-600",
    activeChevron: "text-slate-300 dark:text-slate-500",
    mobileActive: "bg-slate-900/10 text-slate-900 dark:text-slate-100 dark:bg-slate-100/10",
    mobileIcon: "text-slate-800 dark:text-slate-200",
    pill: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
} as const

export function RoleSidebarShell({
  pathname,
  navItems,
  homeHref,
  brandTitle,
  brandSubtitle,
  brandIcon: BrandIcon,
  action,
  accent,
  onLogout,
  mobilePrimaryCount = 4,
}: RoleSidebarShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const tone = ACCENT_STYLES[accent]

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const mobilePrimaryItems = useMemo(() => navItems.slice(0, mobilePrimaryCount), [mobilePrimaryCount, navItems])
  const hasOverflowItems = navItems.length > mobilePrimaryItems.length
  const mobileOverflowActive = hasOverflowItems && navItems.slice(mobilePrimaryCount).some((item) => isActive(item.href))

  return (
    <>
      <aside className="hidden lg:flex w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-full">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <Link href={homeHref} className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white", tone.brand)}>
              <BrandIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{brandTitle}</span>
              <span className="block text-xs text-slate-500">{brandSubtitle}</span>
            </div>
          </Link>
        </div>

        {action ? (
          <div className="px-4 py-4">
            <Link href={action.href}>
              <button className={cn("w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition", tone.action)}>
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            </Link>
          </div>
        ) : null}

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                    active
                      ? tone.active
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      active ? "text-white dark:text-current" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium", active ? "text-white dark:text-current" : "text-slate-900 dark:text-white")}>
                      {item.name}
                    </div>
                    {item.description ? (
                      <div className={cn("text-xs truncate", active ? tone.activeHint : "text-slate-500")}>
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                  {active ? <ChevronRight className={cn("w-4 h-4", tone.activeChevron)} /> : null}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_26px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${hasOverflowItems ? 5 : Math.max(1, mobilePrimaryItems.length)}, minmax(0, 1fr))`,
            }}
          >
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition",
                      active ? tone.mobileActive : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? tone.mobileIcon : "")} />
                    <span className="text-[11px] font-medium leading-4">{item.name}</span>
                  </div>
                </Link>
              )
            })}

            {hasOverflowItems ? (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition",
                  mobileOverflowActive ? tone.mobileActive : "text-slate-500 dark:text-slate-400",
                )}
              >
                <MoreHorizontal className={cn("h-5 w-5", mobileOverflowActive ? tone.mobileIcon : "")} />
                <span className="text-[11px] font-medium leading-4">More</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="bottom"
          className="h-[min(82vh,720px)] rounded-t-[28px] border-x-0 border-b-0 px-0 pb-0"
        >
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
          <SheetHeader className="border-b border-slate-100 px-5 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white", tone.brand)}>
                <BrandIcon className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle>{brandTitle}</SheetTitle>
                <SheetDescription>{brandSubtitle}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {action ? (
              <Link href={action.href} onClick={() => setMobileOpen(false)}>
                <div className={cn("flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition", tone.action)}>
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </div>
              </Link>
            ) : null}

            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 transition",
                        active ? tone.mobileActive : "hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", active ? tone.pill : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                        {item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}
                      </div>
                      {active ? <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", tone.pill)}>Active</span> : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default RoleSidebarShell
