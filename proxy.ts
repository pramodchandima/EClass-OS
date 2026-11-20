import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ADMIN PROTECTION PROXY (MIDDLEWARE)
 * Intercepts all requests to the /admin path and ensures the user 
 * has provided the correct administrative password via secure cookies.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Only process routes matching the /admin pattern
    if (pathname.startsWith('/admin')) {
        const rawCookie = request.cookies.get('admin_password')?.value || '';
        const adminPassword = decodeURIComponent(rawCookie);
        const correctPassword = process.env.ADMIN_PASSWORD;

        // 2. Allow access to the login page itself (or redirect to /admin if already logged in)
        if (pathname.startsWith('/admin/login')) {
            if (correctPassword && (adminPassword === correctPassword || rawCookie === correctPassword)) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
            return NextResponse.next();
        }

        // 3. Verify Administrative Password stored in cookies
        if (!correctPassword) {
            console.error('[Proxy] CRITICAL: ADMIN_PASSWORD is not set in environment variables.');
            // Fail closed: Redirect to login if password is not configured
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // 4. Redirect to login if unauthorized or incorrect password
        if (adminPassword !== correctPassword && rawCookie !== correctPassword) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

/**
 * PATH MATCHER CONFIGURATION
 * Restricts this proxy to run only on administrative routes 
 * to optimize server performance.
 */
export const config = {
    matcher: ['/admin/:path*'],
};
