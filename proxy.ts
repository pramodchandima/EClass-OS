import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ADMIN PROTECTION MIDDLEWARE
 * Intercepts all requests to the /admin path and ensures the user 
 * has provided the correct administrative password via secure cookies.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Only process routes matching the /admin pattern
    if (pathname.startsWith('/admin')) {

        // 2. Allow access to the login page itself to prevent redirect loops
        if (pathname.startsWith('/admin/login')) {
            return NextResponse.next();
        }

        // 3. Verify Administrative Password stored in cookies
        const adminPassword = request.cookies.get('admin_password')?.value;
        const correctPassword = process.env.ADMIN_PASSWORD;

        if (!correctPassword) {
            console.error('[Middleware] CRITICAL: ADMIN_PASSWORD is not set in environment variables.');
            // Fail closed: Redirect to login if password is not configured
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // 4. Redirect to login if unauthorized
        if (adminPassword !== correctPassword) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

/**
 * PATH MATCHER CONFIGURATION
 * Restricts this middleware to run only on administrative routes 
 * and internal assets to optimize server performance.
 */
export const config = {
    matcher: ['/admin/:path*'],
};
