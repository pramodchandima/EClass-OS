import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Poll } from '@/lib/types';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-utils';

/**
 * QUIZ DETAIL API
 * Fetches the complete metadata for a single quiz/poll by its unique identifier.
 * Primarily used by the Student WebApp to render specific question sets.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const pollId = searchParams.get('id');

        // 1. Mandatory Parameter Validation
        if (!pollId) {
            return errorResponse('Missing mandatory parameter: id', 400);
        }

        // 2. Data Retrieval
        const { data: poll, error } = await supabaseAdmin
            .from('polls')
            .select('*')
            .eq('id', pollId)
            .single();

        if (error || !poll) {
            return errorResponse('The requested poll could not be found or has been removed.', 404);
        }

        // 3. Return Strictly Typed Response
        return successResponse({
            ok: true,
            poll: poll as Poll
        });

    } catch (err: any) {
        return serverErrorResponse(err);
    }
}
