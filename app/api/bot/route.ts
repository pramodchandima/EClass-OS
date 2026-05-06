import { NextRequest, NextResponse } from 'next/server';
import bot from '@/lib/telegram';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { watermarkPdf } from '@/lib/pdf';
import { generateAnswerKey } from '@/lib/pdfGenerator';

/**
 * CONFIGURATION
 * ADMIN_ID: The Telegram User ID authorized to perform administrative actions.
 */
const ADMIN_ID = 1003716070013;

/**
 * INTERNAL TYPES
 */
interface Poll {
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

interface Student {
    id: number;
    telegram_id: number;
    full_name: string;
    phone_number: string;
}

interface QuizSet {
    id: string;
    title: string;
}

/**
 * SEQUENTIAL QUIZ ENGINE: SEND NEXT QUESTION
 * This core engine handles the automated flow of questions for a student.
 * 
 * @param telegramId - User's Telegram ID for messaging
 * @param studentDbId - Student's internal Database ID for records
 * @param quizSetId - ID of the Quiz Set being attempted
 */
async function sendNextQuestion(telegramId: number, studentDbId: number, quizSetId: string): Promise<void> {
    try {
        // 1. Retrieve Quiz Set Context
        const { data: setInfo } = await supabaseAdmin
            .from('quiz_sets')
            .select('name')
            .eq('id', quizSetId)
            .single();
        const setTitle = setInfo?.name || 'Current Quiz';

        // 2. Fetch all questions in the set, ordered by index
        const { data: polls } = await supabaseAdmin
            .from('polls')
            .select('*')
            .eq('quiz_set_id', quizSetId)
            .order('order_index', { ascending: true });

        if (!polls || polls.length === 0) {
            console.warn(`[Bot] Quiz Set ${quizSetId} empty or not found.`);
            return;
        }

        // 3. Determine progress by counting existing answers
        const { data: answered } = await supabaseAdmin
            .from('poll_answers')
            .select('poll_id')
            .eq('student_id', studentDbId)
            .in('poll_id', polls.map(p => p.id));

        const answeredIds = answered?.map(a => a.poll_id) || [];
        const nextPoll = (polls as Poll[]).find(p => !answeredIds.includes(p.id));

        // 4. Handle Quiz Completion
        if (!nextPoll) {
            const { data: sessionAnswers } = await supabaseAdmin
                .from('poll_answers')
                .select('earned_points, selected_option, poll_id')
                .in('poll_id', polls.map(p => p.id))
                .eq('student_id', studentDbId);

            let correctCount = 0;
            let totalSetPoints = 0;

            sessionAnswers?.forEach(ans => {
                const poll = (polls as Poll[]).find(p => p.id === ans.poll_id);
                if (poll && ans.selected_option === poll.correct_option) {
                    correctCount++;
                }
                totalSetPoints += ans.earned_points;
            });

            const summary = `🏁 *QUIZ COMPLETED!* 🏁\n\n` +
                `📂 Topic: *${setTitle}*\n` +
                `✅ Correct Answers: *${correctCount} / ${polls.length}*\n` +
                `💎 Points Earned: *${totalSetPoints} pts*\n\n` +
                `🌟 Great job! The Top 3 Winners will be announced in the channel shortly! 🚀`;

            await bot.sendMessage(telegramId, summary, { parse_mode: 'Markdown' });
            return;
        }

        // 5. Deliver the next question via Inline Keyboard
        const currentProgress = answeredIds.length + 1;
        const qHeader = `📊 *QUESTION ${currentProgress}/${polls.length}* 📊\n\n`;
        const qBody = `❓ *${nextPoll.question_text}*`;

        await bot.sendMessage(telegramId, qHeader + qBody, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `🔘 A) ${nextPoll.option_a}`.padEnd(60) + "⠀", callback_data: `ans:${nextPoll.id}:A` }],
                    [{ text: `🔘 B) ${nextPoll.option_b}`.padEnd(60) + "⠀", callback_data: `ans:${nextPoll.id}:B` }],
                    [{ text: `🔘 C) ${nextPoll.option_c}`.padEnd(60) + "⠀", callback_data: `ans:${nextPoll.id}:C` }],
                    [{ text: `🔘 D) ${nextPoll.option_d}`.padEnd(60) + "⠀", callback_data: `ans:${nextPoll.id}:D` }]
                ]
            }
        });
    } catch (err) {
        console.error('[Bot Engine] Critical Error in sendNextQuestion:', err);
    }
}

/**
 * MASTER WEBHOOK HANDLER
 * Processes all incoming Telegram events (Messages, Callbacks, Commands).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 🟢 ROUTE 1: INCOMING MESSAGES
        if (body.message) {
            const { chat, text, from } = body.message;
            const tid = from.id;

            // --- COMMAND: /start or Restart ---
            if (text === '🔄 Restart' || text?.startsWith('/start')) {
                const payload = text?.startsWith('/start') ? text.split(' ')[1] : null;
                const { data: student } = await supabaseAdmin
                    .from('students')
                    .select('*')
                    .eq('telegram_id', tid)
                    .single();

                // 1. Unauthorized Access -> Force Registration
                if (!student) {
                    await bot.sendMessage(chat.id, "Welcome to E-Class! 🎓\nPlease register to join quizzes.", {
                        reply_markup: {
                            inline_keyboard: [[{
                                text: "📝 Register Now",
                                web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/register?tid=${tid}` }
                            }]]
                        }
                    });
                    return NextResponse.json({ ok: true });
                }

                // 2. Sequential Deep Link Initiation: /start quizset_{setId}
                if (payload?.startsWith('quizset_')) {
                    const setId = payload.replace('quizset_', '');
                    await bot.sendMessage(chat.id, `🚀 *Initializing Session...* 🚀`, { parse_mode: 'Markdown' });
                    await sendNextQuestion(tid, student.id, setId);
                    return NextResponse.json({ ok: true });
                }

                // 3. Default Greeting
                await bot.sendMessage(chat.id, `Welcome back, ${student.full_name}! 👋\nUse the buttons below to navigate.`, {
                    reply_markup: {
                        keyboard: [
                            [{ text: '👤 My Profile' }, { text: '📚 Tutes' }],
                            [{ text: '🔄 Restart' }]
                        ],
                        resize_keyboard: true
                    }
                });
                return NextResponse.json({ ok: true });
            }

            // --- ADMIN COMMAND: /publish_pdf [setId] ---
            if (text?.startsWith('/publish_pdf') && tid === ADMIN_ID) {
                const setId = text.split(' ')[1];
                if (!setId) {
                    await bot.sendMessage(chat.id, "❌ Usage: `/publish_pdf {quiz_set_id}`", { parse_mode: 'Markdown' });
                    return NextResponse.json({ ok: true });
                }

                await bot.sendMessage(chat.id, "⏳ Generating Answer Key PDF...");

                // 1. Data Retrieval
                const { data: set } = await supabaseAdmin.from('quiz_sets').select('name').eq('id', setId).single();
                const { data: polls } = await supabaseAdmin.from('polls').select('*').eq('quiz_set_id', setId).order('order_index', { ascending: true });

                if (!set || !polls || polls.length === 0) {
                    await bot.sendMessage(chat.id, "❌ Quiz Set not found or has no questions.");
                    return NextResponse.json({ ok: true });
                }

                // 2. Bilingual PDF Synthesis
                const pdfBuffer = await generateAnswerKey(set.name, polls);

                // 3. Official Channel Broadcast
                const channelId = process.env.TELEGRAM_CHANNEL_ID!;
                await bot.sendDocument(channelId, pdfBuffer, {
                    caption: `📚 *ANSWER KEY & REVIEW SHEET*\n\nTopic: *${set.name}*\nQuestions: *${polls.length}*\n\nUse this to review your performance! 🎓💎`,
                    parse_mode: 'Markdown'
                }, { filename: `${set.name}_Answer_Key.pdf` });

                await bot.sendMessage(chat.id, "✅ PDF Answer Key published successfully!");
                return NextResponse.json({ ok: true });
            }

            // --- COMMAND: Profile View ---
            if (text === '👤 My Profile') {
                const { data: lb } = await supabaseAdmin.from('leaderboard').select('*').eq('telegram_id', tid).single();
                if (lb) {
                    const profileMsg = `👤 *PROFILE*\n\nName: ${lb.full_name}\nPoints: ${lb.total_points} pts\nTelegram ID: ${tid}`;
                    await bot.sendMessage(chat.id, profileMsg, { parse_mode: 'Markdown' });
                }
                return NextResponse.json({ ok: true });
            }

            // --- COMMAND: Materials Library (Tutes) ---
            if (text === '📚 Tutes') {
                const { data: categories } = await supabaseAdmin.from('materials').select('category');
                const uniqueCats = Array.from(new Set(categories?.map(c => c.category) || []));

                if (uniqueCats.length === 0) {
                    await bot.sendMessage(chat.id, "📭 Currently no educational materials available.");
                    return NextResponse.json({ ok: true });
                }

                const kb = uniqueCats.map(cat => ([{ text: `📁 ${cat}`, callback_data: `cat:${cat}` }]));
                await bot.sendMessage(chat.id, "📚 *MATERIALS LIBRARY*\n\nSelect a subject to browse tutes:", {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: kb }
                });
                return NextResponse.json({ ok: true });
            }
        }

        // 🟠 ROUTE 2: CALLBACK QUERIES (Buttons)
        if (body.callback_query) {
            const { id, data, message, from } = body.callback_query;
            const tid = from.id;
            if (!data || !message) return NextResponse.json({ ok: true });

            // --- ACTION: QUIZ ANSWER SUBMISSION ---
            if (data.startsWith('ans:')) {
                const [_, pollId, choice] = data.split(':');

                // 1. Data Integrity Check
                const { data: poll } = await supabaseAdmin.from('polls').select('*').eq('id', pollId).single();
                const { data: student } = await supabaseAdmin.from('students').select('*').eq('telegram_id', tid).single();

                if (!poll || !student) {
                    await bot.answerCallbackQuery(id, { text: "Error finding record! ❌" });
                    return NextResponse.json({ ok: true });
                }

                // 2. Prevent Double Submissions
                const { data: existing } = await supabaseAdmin
                    .from('poll_answers')
                    .select('*')
                    .eq('poll_id', pollId)
                    .eq('student_id', student.id)
                    .single();

                if (existing) {
                    await bot.answerCallbackQuery(id, { text: "You already answered! 🚫" });
                    return NextResponse.json({ ok: true });
                }

                // 3. Scoring Engine (15s sliding scale)
                const now = Math.floor(Date.now() / 1000);
                const elapsed = now - message.date;
                const remaining = 15 - elapsed;

                const isCorrect = choice === poll.correct_option;
                let pts = 0;

                // Grace period: allow submission up to 3s after visual expiration
                if (isCorrect && remaining >= -3) {
                    pts = remaining >= 10 ? 10 : Math.max(1, Math.floor(remaining));
                }

                await supabaseAdmin.from('poll_answers').insert([{
                    poll_id: poll.id,
                    student_id: student.id,
                    selected_option: choice,
                    time_taken_seconds: elapsed,
                    earned_points: pts
                }]);

                // 4. UI Update: Visual Answer Reveal
                const getOptionText = (opt: string) => {
                    if (opt === 'A') return poll.option_a;
                    if (opt === 'B') return poll.option_b;
                    if (opt === 'C') return poll.option_c;
                    return poll.option_d;
                };

                const formatBtn = (opt: string) => {
                    let prefix = "🔘";
                    if (opt === poll.correct_option) prefix = "✅";
                    else if (opt === choice && !isCorrect) prefix = "❌";
                    return (`${prefix} ${opt}) ${getOptionText(opt)}`).padEnd(60) + "⠀";
                };

                await bot.editMessageReplyMarkup({
                    inline_keyboard: [
                        [{ text: formatBtn('A'), callback_data: `ans:${pollId}:A` }],
                        [{ text: formatBtn('B'), callback_data: `ans:${pollId}:B` }],
                        [{ text: formatBtn('C'), callback_data: `ans:${pollId}:C` }],
                        [{ text: formatBtn('D'), callback_data: `ans:${pollId}:D` }]
                    ]
                }, { chat_id: message.chat.id, message_id: message.message_id });

                await bot.answerCallbackQuery(id, {
                    text: isCorrect ? `✅ CORRECT! +${pts} pts` : `❌ INCORRECT! Answer: ${poll.correct_option}`
                });

                // 5. EVENT LOOP YIELD: Trigger Next Question after 1.5s delay
                if (poll.quiz_set_id) {
                    setTimeout(async () => {
                        await sendNextQuestion(tid, student.id, poll.quiz_set_id);
                    }, 1500);
                }

                return NextResponse.json({ ok: true });
            }

            // --- ACTION: BROWSE TUTES ---
            if (data.startsWith('cat:')) {
                const catName = data.split(':')[1];
                const { data: materials } = await supabaseAdmin.from('materials').select('*').eq('category', catName);

                const kb = materials?.map((m: any) => ([{ text: m.title, callback_data: `mat:${m.id}` }])) || [];
                await bot.editMessageText(`📚 *Materials in ${catName}:*`, {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: kb }
                });
                return NextResponse.json({ ok: true });
            }

            // --- ACTION: DOWNLOAD TUTE ---
            if (data.startsWith('mat:')) {
                const matId = data.split(':')[1];
                await bot.editMessageText("⏳ *Preparing authorized document...*", {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                await handleMaterialDownload(tid, matId, message.chat.id);
                return NextResponse.json({ ok: true });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook Runtime Error:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

/**
 * HELPER: PERSONALIZED DOWNLOAD HANDLER
 * Fetches, watermarks, and delivers a PDF document to the student.
 */
async function handleMaterialDownload(telegramId: number, matId: string, chatId: number): Promise<void> {
    try {
        const { data: mt } = await supabaseAdmin.from('materials').select('*').eq('id', matId).single();
        const { data: st } = await supabaseAdmin.from('students').select('*').eq('telegram_id', telegramId).single();

        if (!mt || !st) return;

        let url = mt.file_url;
        // Handle Google Drive UC compatibility
        if (url.includes('drive.google.com')) {
            const driveIdMatch = url.match(/[-\w]{25,}/);
            if (driveIdMatch) {
                url = `https://drive.google.com/uc?export=download&id=${driveIdMatch[0]}`;
            }
        }

        const resp = await fetch(url);
        const buf = Buffer.from(await resp.arrayBuffer());

        // Apply student-specific watermark
        const watermarkedBuf = await watermarkPdf(buf, st.full_name, st.phone_number);

        await bot.sendChatAction(chatId, 'upload_document');
        await bot.sendDocument(chatId, watermarkedBuf, {
            caption: `📚 *${mt.title}*\n👤 Student: ${st.full_name}\n\nHappy studying! 🎓`,
            parse_mode: 'Markdown'
        }, { filename: `${mt.title}.pdf` });

    } catch (e) {
        console.error('[Bot Engine] Download Handler Failed:', e);
    }
}
