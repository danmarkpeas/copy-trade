import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Example: Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // TODO: Check auth cookie or Supabase session here
    // Redirect to /login if not authenticated
  }
  return NextResponse.next()
} 