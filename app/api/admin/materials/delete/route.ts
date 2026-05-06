import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminCookie, errorResponse, successResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        if (!validateAdminCookie(req)) return unauthorizedResponse();

        const { id, url } = await req.json();

        if (!id) {
            return errorResponse('Material ID is required.');
        }

        // Delete from Storage if hosted on Supabase
        if (url && url.includes('/storage/v1/object/public/')) {
            const parts = url.split('/');
            const fileName = parts[parts.length - 1];
            await supabaseAdmin.storage.from('materials').remove([`materials/${fileName}`]);
        }

        // Delete from Database
        const { error: dbError } = await supabaseAdmin.from('materials').delete().eq('id', id);

        if (dbError) {
            return errorResponse('Database delete failed: ' + dbError.message);
        }

        return successResponse();
    } catch (error) {
        return serverErrorResponse(error);
    }
}
