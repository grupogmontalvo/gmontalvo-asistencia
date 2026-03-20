import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes (not /admin/login)
  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie (set by @supabase/ssr)
  const cookieHeader = request.cookies.toString()
  const hasSession = request.cookies.getAll().some(c => 
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
