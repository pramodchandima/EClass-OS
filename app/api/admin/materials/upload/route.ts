import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminCookie, errorResponse, successResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        if (!validateAdminCookie(req)) return unauthorizedResponse();

        const formData = await req.formData();
        const title = formData.get('title') as string;
        const category = formData.get('category') as string;
        const driveUrl = formData.get('driveUrl') as string | null;
        const file = formData.get('file') as File | null;

        if (!title || !category) {
            return errorResponse('Title and category are required.');
        }

        if (!file && !driveUrl) {
            return errorResponse('File or Drive URL is required.');
        }

        let finalUrl = '';

        if (file) {
            const fileName = `${crypto.randomUUID()}.pdf`;
            const filePath = `materials/${fileName}`;
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { error: uploadError } = await supabaseAdmin.storage
                .from('materials')
                .upload(filePath, buffer, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                console.error('[Upload API] Storage Error:', uploadError);
                return errorResponse('Storage upload failed: ' + uploadError.message);
            }

            const { data } = supabaseAdmin.storage.from('materials').getPublicUrl(filePath);
            finalUrl = data.publicUrl;
        } else if (driveUrl) {
            // Convert drive link
            const match = driveUrl.match(/\/d\/([\w-]+)/);
            finalUrl = match?.[1] ? `https://drive.google.com/uc?export=download&id=${match[1]}` : driveUrl;
        }

        const { error: dbError } = await supabaseAdmin.from('materials').insert([{
            title,
            category,
            file_url: finalUrl,
        }]);

        if (dbError) {
            console.error('[Upload API] DB Error:', dbError);
            return errorResponse('Database insert failed: ' + dbError.message);
        }

        return successResponse({ file_url: finalUrl });
    } catch (error) {
        return serverErrorResponse(error);
    }
}
