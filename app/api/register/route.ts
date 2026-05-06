import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bot from '@/lib/telegram';

/**
 * INTERNAL TYPES
 */
interface RegistrationPayload {
    tid: string;
    fullName: string;
    phoneNumber: string;
}

/**
 * STUDENT REGISTRATION API
 * Standardizes the process of enrolling a new student into the system.
 * 
 * WORKFLOW:
 * 1. Validates the existence of mandatory student metadata.
 * 2. Persists the student record to Supabase with the Telegram ID as a foreign key.
 * 3. Notifies the student via the Telegram Bot, delivering the persistent command keyboard.
 */
export async function POST(req: NextRequest) {
    try {
        const { tid, fullName, phoneNumber } = (await req.json()) as RegistrationPayload;

        // 1. Mandatory Field Validation
        if (!tid || !fullName || !phoneNumber) {
            return NextResponse.json({ ok: false, error: 'Missing required configuration fields' }, { status: 400 });
        }

        const telegramId = parseInt(tid, 10);
        if (isNaN(telegramId)) {
            return NextResponse.json({ ok: false, error: 'Malformed Telegram ID' }, { status: 400 });
        }

        // 2. Database Ingestion
        const { error: dbError } = await supabaseAdmin.from('students').insert([
            {
                telegram_id: telegramId,
                full_name: fullName,
                phone_number: phoneNumber,
            },
        ]);

        if (dbError) {
            console.error('[Registration API] Database Error:', dbError);
            return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
        }

        // 3. Proactive Bot Notification
        // We attempt to welcome the student and provide the main navigation keyboard.
        try {
            const welcomeMsg = `✅ *Registration Successful!*\n\nWelcome to E-Class, ${fullName}! You can now access all materials and quizzes. 🎓🚀`;

            await bot.sendMessage(tid, welcomeMsg, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: '👤 My Profile' }, { text: '📚 Tutes' }],
                        [{ text: '🏆 Leaderboard' }]
                    ],
                    resize_keyboard: true
                }
            });
        } catch (botErr) {
            // Note: We swallow bot errors here to prevent registration failure 
            // if the student has blocked the bot or if Telegram is temporarily down.
            console.error('[Registration API] Bot Welcome Notification Failed:', botErr);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('[Registration API] Critical Runtime Error:', error);
        return NextResponse.json({ ok: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
