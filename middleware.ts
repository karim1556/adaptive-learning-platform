import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_COOKIE = 'adaptiq_role'

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const path = url.pathname

  const role = req.cookies.get(ROLE_COOKIE)?.value || null

  const routes: Array<{ prefix: string; role: string }> = [
    { prefix: '/student', role: 'student' },
    { prefix: '/teacher', role: 'teacher' },
    { prefix: '/admin', role: 'admin' },
    { prefix: '/parent', role: 'parent' },
  ]

  for (const r of routes) {
    if (path.startsWith(r.prefix)) {
      // If no role cookie, redirect to login
      if (!role) {
        url.pathname = '/login'
        url.searchParams.set('redirectedFrom', path)
        return NextResponse.redirect(url)
      }

      // If role doesn't match the route, redirect user to their dashboard root
      if (role !== r.role) {
        const dest = `/${role}`
        url.pathname = dest
        return NextResponse.redirect(url)
      }

      // role matches; allow
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*', '/parent/:path*'],
}
