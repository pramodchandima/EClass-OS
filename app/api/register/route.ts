import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bot from '@/lib/telegram';

interface RegistrationPayload {
    tid: string;
    fullName: string;
    phoneNumber: string;
}

/**
 * POST /api/register
 * Enrolls a new student into the system.
 *
 * Steps:
 *  1. Validates required fields.
 *  2. Inserts the student record into Supabase.
 *  3. Sends a welcome message via the Telegram Bot (failure is non-fatal).
 */
export async function POST(req: NextRequest) {
    try {
        const { tid, fullName, phoneNumber } = (await req.json()) as RegistrationPayload;

        if (!tid || !fullName || !phoneNumber) {
            return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
        }

        const telegramId = parseInt(tid, 10);
        if (isNaN(telegramId)) {
            return NextResponse.json({ ok: false, error: 'Malformed Telegram ID' }, { status: 400 });
        }

        const { error: dbError } = await supabaseAdmin.from('students').insert([{
            telegram_id: telegramId,
            full_name: fullName,
            phone_number: phoneNumber,
        }]);

        if (dbError) {
            console.error('[Registration] Database insert failed:', dbError);
            return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
        }

        // Welcome notification — swallowed if Telegram is unreachable or student blocked the bot
        bot.sendMessage(tid,
            `✅ *Registration Successful!*\n\nWelcome to E-Class, ${fullName}! You can now access all materials and quizzes. 🎓🚀`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: '👤 My Profile' }, { text: '📚 Tutes' }],
                        [{ text: '🏆 Leaderboard' }],
                    ],
                    resize_keyboard: true,
                },
            }
        ).catch(err => console.error('[Registration] Bot notification failed:', err));

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Registration] Critical runtime error:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
