import { NextRequest, NextResponse } from 'next/server';
import bot from '@/lib/telegram';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { watermarkPdf } from '@/lib/pdf';
import { generateAnswerKey } from '@/lib/pdfGenerator';

/** Telegram User ID with admin privileges (matches the channel owner). */
const ADMIN_ID = 1003716070013;

// ─── Internal Types ────────────────────────────────────────────────────────────

interface DbPoll {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    quiz_set_id: string;
    order_index: number;
}

interface DbStudent {
    id: number;
    telegram_id: number;
    full_name: string;
    phone_number: string;
}

// ─── Core Quiz Engine ──────────────────────────────────────────────────────────

/**
 * Sends the next unanswered question in a quiz set to a student.
 * Sends a completion summary when all questions have been answered.
 */
async function sendNextQuestion(telegramId: number, studentDbId: number, quizSetId: string): Promise<void> {
    try {
        // Fetch set name and all questions in parallel
        const [{ data: setInfo }, { data: polls }] = await Promise.all([
            supabaseAdmin.from('quiz_sets').select('name').eq('id', quizSetId).single(),
            supabaseAdmin.from('polls').select('*').eq('quiz_set_id', quizSetId).order('order_index', { ascending: true }),
        ]);

        if (!polls || polls.length === 0) {
            console.warn(`[Bot] Quiz Set ${quizSetId} is empty or not found.`);
            return;
        }

        const setTitle = setInfo?.name ?? 'Current Quiz';
        const typedPolls = polls as DbPoll[];

        // Count already-answered questions for this student
        const { data: answered } = await supabaseAdmin
            .from('poll_answers')
            .select('poll_id')
            .eq('student_id', studentDbId)
            .in('poll_id', typedPolls.map(p => p.id));

        const answeredIds = new Set(answered?.map(a => a.poll_id) ?? []);
        const nextPoll = typedPolls.find(p => !answeredIds.has(p.id));

        // ── Quiz Completed ───────────────────────────────────────────────────
        if (!nextPoll) {
            const { data: sessionAnswers } = await supabaseAdmin
                .from('poll_answers')
                .select('earned_points, selected_option, poll_id')
                .in('poll_id', typedPolls.map(p => p.id))
                .eq('student_id', studentDbId);

            let correctCount = 0;
            let totalPoints = 0;

            for (const ans of sessionAnswers ?? []) {
                const poll = typedPolls.find(p => p.id === ans.poll_id);
                if (poll && ans.selected_option === poll.correct_option) correctCount++;
                totalPoints += ans.earned_points;
            }

            await bot.sendMessage(telegramId,
                `🏁 *QUIZ COMPLETED!* 🏁\n\n` +
                `📂 Topic: *${setTitle}*\n` +
                `✅ Correct Answers: *${correctCount} / ${typedPolls.length}*\n` +
                `💎 Points Earned: *${totalPoints} pts*\n\n` +
                `🌟 Great job! The Top 3 Winners will be announced in the channel shortly! 🚀`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // ── Send Next Question ───────────────────────────────────────────────
        const currentProgress = answeredIds.size + 1;
        await bot.sendMessage(
            telegramId,
            `📊 *QUESTION ${currentProgress}/${typedPolls.length}* 📊\n\n❓ *${nextPoll.question_text}*`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `🔘 A) ${nextPoll.option_a}`.padEnd(60) + '⠀', callback_data: `ans:${nextPoll.id}:A` }],
                        [{ text: `🔘 B) ${nextPoll.option_b}`.padEnd(60) + '⠀', callback_data: `ans:${nextPoll.id}:B` }],
                        [{ text: `🔘 C) ${nextPoll.option_c}`.padEnd(60) + '⠀', callback_data: `ans:${nextPoll.id}:C` }],
                        [{ text: `🔘 D) ${nextPoll.option_d}`.padEnd(60) + '⠀', callback_data: `ans:${nextPoll.id}:D` }],
                    ],
                },
            }
        );
    } catch (err) {
        console.error('[Bot Engine] sendNextQuestion error:', err);
    }
}

// ─── Webhook Handler ───────────────────────────────────────────────────────────

/** Processes all incoming Telegram events (messages, commands, callback queries). */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // ── Incoming Message ─────────────────────────────────────────────────
        if (body.message) {
            const { chat, text, from } = body.message as {
                chat: { id: number };
                text?: string;
                from: { id: number };
            };
            const tid: number = from.id;

            // /start or 🔄 Restart
            if (text === '🔄 Restart' || text?.startsWith('/start')) {
                const payload = text.startsWith('/start') ? text.split(' ')[1] : null;
                const { data: student } = await supabaseAdmin.from('students').select('*').eq('telegram_id', tid).single();

                if (!student) {
                    await bot.sendMessage(chat.id, 'Welcome to E-Class! 🎓\nPlease register to join quizzes.', {
                        reply_markup: {
                            inline_keyboard: [[{
                                text: '📝 Register Now',
                                web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/register?tid=${tid}` },
                            }]],
                        },
                    });
                    return NextResponse.json({ ok: true });
                }

                if (payload?.startsWith('quizset_')) {
                    const setId = payload.replace('quizset_', '');
                    await bot.sendMessage(chat.id, '🚀 *Initializing Session...* 🚀', { parse_mode: 'Markdown' });
                    await sendNextQuestion(tid, student.id, setId);
                    return NextResponse.json({ ok: true });
                }

                await bot.sendMessage(chat.id, `Welcome back, ${(student as DbStudent).full_name}! 👋\nUse the buttons below to navigate.`, {
                    reply_markup: {
                        keyboard: [[{ text: '👤 My Profile' }, { text: '📚 Tutes' }], [{ text: '🔄 Restart' }]],
                        resize_keyboard: true,
                    },
                });
                return NextResponse.json({ ok: true });
            }

            // /publish_pdf [setId]  — admin only
            if (text?.startsWith('/publish_pdf') && tid === ADMIN_ID) {
                const setId = text.split(' ')[1];
                if (!setId) {
                    await bot.sendMessage(chat.id, '❌ Usage: `/publish_pdf {quiz_set_id}`', { parse_mode: 'Markdown' });
                    return NextResponse.json({ ok: true });
                }

                await bot.sendMessage(chat.id, '⏳ Generating Answer Key PDF...');

                const [{ data: set }, { data: polls }] = await Promise.all([
                    supabaseAdmin.from('quiz_sets').select('name').eq('id', setId).single(),
                    supabaseAdmin.from('polls').select('*').eq('quiz_set_id', setId).order('order_index', { ascending: true }),
                ]);

                if (!set || !polls?.length) {
                    await bot.sendMessage(chat.id, '❌ Quiz Set not found or has no questions.');
                    return NextResponse.json({ ok: true });
                }

                const pdfBuffer = await generateAnswerKey(set.name, polls as DbPoll[]);
                const channelId = process.env.TELEGRAM_CHANNEL_ID!;

                await bot.sendDocument(channelId, pdfBuffer, {
                    caption: `📚 *ANSWER KEY & REVIEW SHEET*\n\nTopic: *${set.name}*\nQuestions: *${polls.length}*\n\nUse this to review your performance! 🎓💎`,
                    parse_mode: 'Markdown',
                }, { filename: `${set.name}_Answer_Key.pdf` });

                await bot.sendMessage(chat.id, '✅ PDF Answer Key published successfully!');
                return NextResponse.json({ ok: true });
            }

            // 👤 My Profile
            if (text === '👤 My Profile') {
                const { data: lb } = await supabaseAdmin.from('leaderboard').select('*').eq('telegram_id', tid).single();
                if (lb) {
                    await bot.sendMessage(chat.id,
                        `👤 *PROFILE*\n\nName: ${lb.full_name}\nPoints: ${lb.total_points} pts\nTelegram ID: ${tid}`,
                        { parse_mode: 'Markdown' }
                    );
                }
                return NextResponse.json({ ok: true });
            }

            // 📚 Tutes — browse material categories
            if (text === '📚 Tutes') {
                const { data: categories } = await supabaseAdmin.from('materials').select('category');
                const uniqueCats = [...new Set(categories?.map(c => c.category) ?? [])];

                if (!uniqueCats.length) {
                    await bot.sendMessage(chat.id, '📭 Currently no educational materials available.');
                    return NextResponse.json({ ok: true });
                }

                await bot.sendMessage(chat.id, '📚 *MATERIALS LIBRARY*\n\nSelect a subject to browse tutes:', {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: uniqueCats.map(cat => [{ text: `📁 ${cat}`, callback_data: `cat:${cat}` }]) },
                });
                return NextResponse.json({ ok: true });
            }
        }

        // ── Callback Query (Inline Button Press) ─────────────────────────────
        if (body.callback_query) {
            const { id, data, message, from } = body.callback_query as {
                id: string;
                data?: string;
                from: { id: number };
                message?: { chat: { id: number }; message_id: number; date: number };
            };

            if (!data || !message) return NextResponse.json({ ok: true });
            const tid: number = from.id;

            // ── Answer Submission ─────────────────────────────────────────────
            if (data.startsWith('ans:')) {
                const [, pollId, choice] = data.split(':');

                const [{ data: poll }, { data: student }] = await Promise.all([
                    supabaseAdmin.from('polls').select('*').eq('id', pollId).single(),
                    supabaseAdmin.from('students').select('*').eq('telegram_id', tid).single(),
                ]);

                if (!poll || !student) {
                    await bot.answerCallbackQuery(id, { text: 'Error finding record! ❌' });
                    return NextResponse.json({ ok: true });
                }

                // Prevent duplicate submissions
                const { data: existing } = await supabaseAdmin
                    .from('poll_answers')
                    .select('id')
                    .eq('poll_id', pollId)
                    .eq('student_id', (student as DbStudent).id)
                    .single();

                if (existing) {
                    await bot.answerCallbackQuery(id, { text: 'You already answered! 🚫' });
                    return NextResponse.json({ ok: true });
                }

                // Scoring: 15-second sliding scale with a 3s grace period
                const elapsed = Math.floor(Date.now() / 1000) - message.date;
                const remaining = 15 - elapsed;
                const isCorrect = choice === poll.correct_option;
                const pts = isCorrect && remaining >= -3 ? (remaining >= 10 ? 10 : Math.max(1, Math.floor(remaining))) : 0;

                await supabaseAdmin.from('poll_answers').insert([{
                    poll_id: poll.id,
                    student_id: (student as DbStudent).id,
                    selected_option: choice,
                    time_taken_seconds: elapsed,
                    earned_points: pts,
                }]);

                // Helper to resolve option text by key
                const getOptionText = (opt: string) =>
                    poll[`option_${opt.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'];

                const formatBtn = (opt: string) => {
                    const prefix = opt === poll.correct_option ? '✅' : (opt === choice && !isCorrect ? '❌' : '🔘');
                    return (`${prefix} ${opt}) ${getOptionText(opt)}`).padEnd(60) + '⠀';
                };

                await bot.editMessageReplyMarkup(
                    { inline_keyboard: ['A', 'B', 'C', 'D'].map(opt => [{ text: formatBtn(opt), callback_data: `ans:${pollId}:${opt}` }]) },
                    { chat_id: message.chat.id, message_id: message.message_id }
                );

                await bot.answerCallbackQuery(id, {
                    text: isCorrect ? `✅ CORRECT! +${pts} pts` : `❌ INCORRECT! Answer: ${poll.correct_option}`,
                });

                // Trigger next question after a short delay so the student sees the result
                if (poll.quiz_set_id) {
                    setTimeout(() => sendNextQuestion(tid, (student as DbStudent).id, poll.quiz_set_id), 1500);
                }

                return NextResponse.json({ ok: true });
            }

            // ── Browse Category ───────────────────────────────────────────────
            if (data.startsWith('cat:')) {
                const catName = data.slice(4);
                const { data: materials } = await supabaseAdmin.from('materials').select('id, title').eq('category', catName);

                await bot.editMessageText(`📚 *Materials in ${catName}:*`, {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: materials?.map(m => [{ text: m.title, callback_data: `mat:${m.id}` }]) ?? [] },
                });
                return NextResponse.json({ ok: true });
            }

            // ── Download Material ─────────────────────────────────────────────
            if (data.startsWith('mat:')) {
                await bot.editMessageText('⏳ *Preparing authorized document...*', {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown',
                });
                await handleMaterialDownload(tid, data.slice(4), message.chat.id);
                return NextResponse.json({ ok: true });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Webhook] Runtime Error:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

// ─── Helper: Personalized PDF Delivery ────────────────────────────────────────

/**
 * Fetches a material PDF from its stored URL, applies a student-specific watermark,
 * and sends it directly to the student's chat.
 */
async function handleMaterialDownload(telegramId: number, matId: string, chatId: number): Promise<void> {
    try {
        const [{ data: mt }, { data: st }] = await Promise.all([
            supabaseAdmin.from('materials').select('*').eq('id', matId).single(),
            supabaseAdmin.from('students').select('full_name, phone_number').eq('telegram_id', telegramId).single(),
        ]);

        if (!mt || !st) return;

        // Normalize Google Drive share links to direct-download format
        let url: string = mt.file_url;
        if (url.includes('drive.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match) url = `https://drive.google.com/uc?export=download&id=${match[0]}`;
        }

        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch material: HTTP ${resp.status}`);

        const buf = Buffer.from(await resp.arrayBuffer());
        const watermarkedBuf = await watermarkPdf(buf, st.full_name, st.phone_number);

        await bot.sendChatAction(chatId, 'upload_document');
        await bot.sendDocument(chatId, watermarkedBuf, {
            caption: `📚 *${mt.title}*\n👤 Student: ${st.full_name}\n\nHappy studying! 🎓`,
            parse_mode: 'Markdown',
        }, { filename: `${mt.title}.pdf` });
    } catch (e) {
        console.error('[Bot Engine] Material download failed:', e);
    }
}
