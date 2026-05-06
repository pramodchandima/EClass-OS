import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/verify
 * Validates the provided password against ADMIN_PASSWORD without
 * exposing the secret. Returns 401 on mismatch.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { password } = body as { password?: string };
        const correctPassword = process.env.ADMIN_PASSWORD;

        if (!correctPassword) {
            console.error('[Verify API] ADMIN_PASSWORD env var is not set.');
            return NextResponse.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
        }

        if (!password || password !== correctPassword) {
            return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
        }

        return NextResponse.json({ ok: true });
    } catch {
        // JSON parse failures or unexpected errors
        return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
    }
}
