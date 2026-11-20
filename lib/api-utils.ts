import { NextRequest, NextResponse } from 'next/server';

/** Validates the x-admin-secret request header against ADMIN_PASSWORD. */
export function validateAdminSecret(req: NextRequest): boolean {
    return req.headers.get('x-admin-secret') === process.env.ADMIN_PASSWORD;
}

/** Validates the admin_password cookie against ADMIN_PASSWORD. */
export function validateAdminCookie(req: NextRequest): boolean {
    const raw = req.cookies.get('admin_password')?.value;
    if (!raw) return false;
    return raw === process.env.ADMIN_PASSWORD || decodeURIComponent(raw) === process.env.ADMIN_PASSWORD;
}

// --- Standardized JSON Response Helpers ---

export const successResponse = (data: Record<string, unknown> = {}) =>
    NextResponse.json({ ok: true, ...data });

export const errorResponse = (message: string, status = 400) =>
    NextResponse.json({ ok: false, error: message }, { status });

export const serverErrorResponse = (error: unknown) => {
    console.error('[API Error]:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
};

export const unauthorizedResponse = () =>
    errorResponse('Unauthorized Access Denied', 401);
