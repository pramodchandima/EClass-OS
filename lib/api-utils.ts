import { NextRequest, NextResponse } from 'next/server';

/**
 * STANDARD API UTILITIES
 * Centralizes authentication, error handling, and response formatting for system consistency.
 */

/**
 * VALIDATE ADMIN SECRET
 * Ensures the 'x-admin-secret' header matches the system's ADMIN_PASSWORD.
 */
export function validateAdminSecret(req: NextRequest): boolean {
    const secret = req.headers.get('x-admin-secret');
    return secret === process.env.ADMIN_PASSWORD;
}

/**
 * VALIDATE ADMIN COOKIE
 * Fallback authentication for browser-based admin triggers.
 */
export function validateAdminCookie(req: NextRequest): boolean {
    const cookie = req.cookies.get('admin_password')?.value;
    return cookie === process.env.ADMIN_PASSWORD;
}

/**
 * JSON RESPONSE HELPERS
 */
export function successResponse(data: any = { ok: true }) {
    return NextResponse.json(data);
}

export function errorResponse(message: string, status: number = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export function serverErrorResponse(error: any) {
    console.error('[API Error]:', error);
    return NextResponse.json(
        { ok: false, error: 'Internal Server Error' },
        { status: 500 }
    );
}

/**
 * UNAUTHORIZED RESPONSE
 */
export function unauthorizedResponse() {
    return errorResponse('Unauthorized Access Denied', 401);
}
