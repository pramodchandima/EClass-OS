import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminCookie, errorResponse, successResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        if (!validateAdminCookie(req)) return unauthorizedResponse();

        const { action, payload } = await req.json();

        switch (action) {
            case 'CREATE_SET': {
                const { error } = await supabaseAdmin.from('quiz_sets').insert([payload]);
                if (error) return errorResponse('Failed to create quiz set: ' + error.message);
                return successResponse();
            }
            case 'BATCH_INSERT_POLLS': {
                const { error } = await supabaseAdmin.from('polls').insert(payload);
                if (error) return errorResponse('Failed to insert polls: ' + error.message);
                return successResponse();
            }
            case 'DELETE_SET': {
                const { error } = await supabaseAdmin.from('quiz_sets').delete().eq('id', payload.id);
                if (error) return errorResponse('Failed to delete quiz set: ' + error.message);
                return successResponse();
            }
            default:
                return errorResponse('Invalid action');
        }
    } catch (error) {
        return serverErrorResponse(error);
    }
}
