import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bot from '@/lib/telegram';
import { Poll } from '@/lib/types';
import {
    validateAdminSecret, validateAdminCookie,
    unauthorizedResponse, successResponse, errorResponse, serverErrorResponse,
} from '@/lib/api-utils';

/**
 * POST /api/quizzes/publish
 * Broadcasts a single poll to the official Telegram channel.
 *
 * Security: requires x-admin-secret header OR admin_password cookie.
 */
export async function POST(req: NextRequest) {
    try {
        if (!validateAdminSecret(req) && !validateAdminCookie(req)) return unauthorizedResponse();

        const { pollId } = await req.json() as { pollId?: string };
        const channelId = process.env.TELEGRAM_CHANNEL_ID;

        if (!pollId)    return errorResponse('Missing required field: pollId');
        if (!channelId) return errorResponse('TELEGRAM_CHANNEL_ID is not configured.');

        const { data: poll, error: fetchError } = await supabaseAdmin
            .from('polls').select('*').eq('id', pollId).single();

        if (fetchError || !poll) return errorResponse('Poll not found in database.');

        const p = poll as Poll;

        const questionText =
            `📊 *QUIZ TIME!*\n\n${p.question_text}\n\n` +
            `A) ${p.option_a}\nB) ${p.option_b}\nC) ${p.option_c}\nD) ${p.option_d}`;

        const webAppUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quiz?pollId=${p.id}`;

        const sentMessage = await bot.sendMessage(channelId, questionText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '📝 OPEN FULL-SCREEN QUIZ', url: webAppUrl }]] },
        });

        // Persist message_id for future tracking / editing
        await supabaseAdmin.from('polls').update({
            is_published: true,
            telegram_message_id: sentMessage.message_id,
            scheduled_for: new Date().toISOString(),
        }).eq('id', pollId);

        return successResponse();
    } catch (error) {
        return serverErrorResponse(error);
    }
}
