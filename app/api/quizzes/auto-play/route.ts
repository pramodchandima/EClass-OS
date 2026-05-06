import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { QuizSet } from '@/lib/types';
import {
    validateAdminSecret,
    validateAdminCookie,
    unauthorizedResponse,
    successResponse,
    serverErrorResponse
} from '@/lib/api-utils';

/**
 * AUTO-PLAY WORKER TRIGGER (CRON)
 * 
 * This endpoint checks for scheduled Quiz Sets that are due and initiates them 
 * by triggering the Sequence Runner.
 * 
 * PERFORMANCE: This should be called once every 1 minute via a Cron Job (e.g., Vercel Cron).
 * SECURITY: Requires 'x-admin-secret' header (for Cron) OR 'admin_password' cookie (for manual triggers).
 */
export async function GET(req: NextRequest) {
    try {
        // 🛡️ SECURITY: Unified Admin Validation (Headers + Cookies)
        if (!validateAdminSecret(req) && !validateAdminCookie(req)) {
            return unauthorizedResponse();
        }

        const now = new Date().toISOString();

        // 1. Find the next due quiz set that is still in 'scheduled' status
        const { data: dueSet, error } = await supabaseAdmin
            .from('quiz_sets')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now)
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .single();

        if (error || !dueSet) {
            return successResponse({ ok: true, message: 'No quiz sets due at this time.' });
        }

        const targetSet = dueSet as QuizSet;

        // 2. Trigger the sequence runner internally
        const sequenceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/quizzes/sequence`;
        const adminSecret = process.env.ADMIN_PASSWORD;

        if (!adminSecret) {
            throw new Error('ADMIN_PASSWORD not configured on server.');
        }

        /**
         * Fire-and-forget: Trigger the sequence runner and return success immediately 
         * to the Cron caller while the bot starts broadcasting in the background.
         */
        fetch(sequenceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': adminSecret
            },
            body: JSON.stringify({ setId: targetSet.id }),
        }).catch(err => console.error('[Auto-Play] Internal Sequence trigger failed:', err));

        return successResponse({
            ok: true,
            message: `Auto-play initiated for: ${targetSet.name}`,
            setId: targetSet.id
        });

    } catch (error: any) {
        return serverErrorResponse(error);
    }
}
