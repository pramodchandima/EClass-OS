import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bot from '@/lib/telegram';
import { Poll } from '@/lib/types';
import {
    validateAdminSecret,
    validateAdminCookie,
    unauthorizedResponse,
    successResponse,
    errorResponse,
    serverErrorResponse
} from '@/lib/api-utils';

/**
 * QUIZ PUBLISH API
 * Manually pushes a specific poll to the official Telegram Channel.
 * 
 * SECURITY: Requires 'x-admin-secret' header OR 'admin_password' cookie.
 */
export async function POST(req: NextRequest) {
    try {
        // 🛡️ SECURITY: Admin Authentication
        if (!validateAdminSecret(req) && !validateAdminCookie(req)) {
            return unauthorizedResponse();
        }

        const { pollId } = await req.json();
        const channelId = process.env.TELEGRAM_CHANNEL_ID;

        if (!channelId) {
            return errorResponse('TELEGRAM_CHANNEL_ID is not configured.');
        }

        // 1. Data Retrieval
        const { data: poll, error: fetchError } = await supabaseAdmin
            .from('polls')
            .select('*')
            .eq('id', pollId)
            .single();

        if (fetchError || !poll) {
            return errorResponse('Poll not found in database.');
        }

        const targetPoll = poll as Poll;

        // 2. Message Synthesis
        const questionText = `📊 *QUIZ TIME!*\n\n${targetPoll.question_text}\n\n` +
            `A) ${targetPoll.option_a}\n` +
            `B) ${targetPoll.option_b}\n` +
            `C) ${targetPoll.option_c}\n` +
            `D) ${targetPoll.option_d}`;

        const webAppUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quiz?pollId=${targetPoll.id}`;

        // 3. Official Channel Broadcast
        const sentMessage = await bot.sendMessage(channelId, questionText, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📝 OPEN FULL-SCREEN QUIZ', url: webAppUrl }
                    ]
                ]
            }
        });

        // 4. Persistence: Log the Telegram Message ID for future tracking/editing
        await supabaseAdmin
            .from('polls')
            .update({
                is_published: true,
                telegram_message_id: sentMessage.message_id,
                scheduled_for: new Date().toISOString()
            })
            .eq('id', pollId);

        return successResponse();

    } catch (error: any) {
        return serverErrorResponse(error);
    }
}
