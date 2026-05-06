import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bot from '@/lib/telegram';
import { generateAnswerKey } from '@/lib/pdfGenerator';
import {
    validateAdminSecret, validateAdminCookie,
    unauthorizedResponse, successResponse, serverErrorResponse,
} from '@/lib/api-utils';

type SequenceAction = 'broadcast_winners' | 'initiate_quiz' | undefined;

interface AnswerRow {
    earned_points: number;
    student_id: string;
    students: { full_name: string };
}

/**
 * POST /api/quizzes/sequence
 * Manages the full lifecycle of a mass quiz session:
 *  - Default: broadcasts an invitation to the channel with a deep-link start button.
 *  - action='broadcast_winners': calculates the Top 3 podium, posts it, and publishes the Answer Key PDF.
 */
export async function POST(req: NextRequest) {
    try {
        if (!validateAdminSecret(req) && !validateAdminCookie(req)) return unauthorizedResponse();

        const { setId, setName, action } = (await req.json()) as {
            setId?: string;
            setName?: string;
            action?: SequenceAction;
        };

        const channelId = process.env.TELEGRAM_CHANNEL_ID;
        if (!setId || !channelId) throw new Error('Mandatory context (Set ID or Channel ID) is missing.');

        // Resolve set name if not provided by the caller
        const targetSetName = setName ?? (await supabaseAdmin
            .from('quiz_sets').select('name').eq('id', setId).single()
        ).data?.name ?? 'Untitled Quiz';

        // ── ACTION: Announce Winners & Publish PDF ────────────────────────────
        if (action === 'broadcast_winners') {
            const { data: answers, error: resError } = await supabaseAdmin
                .from('poll_answers')
                .select('earned_points, student_id, students(full_name), polls!inner(quiz_set_id)')
                .eq('polls.quiz_set_id', setId);

            if (resError || !answers) {
                console.error('[Podium] DB error:', resError);
                throw new Error('Could not calculate podium results.');
            }

            // Aggregate scores in memory: O(N)
            const scoreMap: Record<string, { name: string; pts: number }> = {};
            for (const ans of answers as unknown as AnswerRow[]) {
                if (!scoreMap[ans.student_id]) {
                    scoreMap[ans.student_id] = { name: ans.students?.full_name ?? 'Anonymous', pts: 0 };
                }
                scoreMap[ans.student_id].pts += ans.earned_points ?? 0;
            }

            const top3 = Object.values(scoreMap).sort((a, b) => b.pts - a.pts).slice(0, 3);
            if (!top3.length) return successResponse();

            const medals = ['🥇', '🥈', '🥉'];
            const podium = `🏆 *THE WINNERS PODIUM* 🏆\n\nSession: *${targetSetName}*\n\n` +
                top3.map((s, i) => `${medals[i] ?? '🎖️'} *${s.name}* — ${s.pts} Points`).join('\n') +
                '\n\n🌟 Congratulations to everyone who participated!';

            await bot.sendMessage(channelId, podium, { parse_mode: 'Markdown' });

            // PDF synthesis is non-blocking for the podium broadcast
            (async () => {
                try {
                    const { data: allPolls, error: fetchErr } = await supabaseAdmin.from('polls').select('*').eq('quiz_set_id', setId).order('order_index', { ascending: true });
                    if (fetchErr) throw fetchErr;
                    if (!allPolls?.length) return;

                    const pdfBuffer = await generateAnswerKey(targetSetName, allPolls);
                    const filename = `${targetSetName.replace(/\s+/g, '_')}_Answers.pdf`;
                    await bot.sendDocument(channelId, pdfBuffer, {
                        caption: `📚 *OFFICIAL ANSWER KEY & REVIEW SHEET*\n\nTopic: *${targetSetName}*\nQuestions: *${allPolls.length}*\n\nUse this to review your performance! 🎓💎`,
                        parse_mode: 'Markdown',
                    }, { filename });
                } catch (err) {
                    console.error('[Sequence] PDF publication failed:', err);
                }
            })();

            await supabaseAdmin.from('quiz_sets').update({ status: 'completed' }).eq('id', setId);
            return successResponse();
        }

        // ── DEFAULT ACTION: Broadcast Invitation ──────────────────────────────
        const [{ count }, botInfo] = await Promise.all([
            supabaseAdmin.from('polls').select('*', { count: 'exact', head: true }).eq('quiz_set_id', setId),
            bot.getMe(),
        ]);

        const startLink = `https://t.me/${botInfo.username}?start=quizset_${setId}`;
        const invitation =
            `🌟 *NEW QUIZ SESSION IS LIVE!* 🌟\n\n` +
            `📚 Topic: *${targetSetName}*\n` +
            `🔢 Questions: *${count ?? 0}*\n` +
            `⏱️ Time Limit: *15s per Question*\n\n` +
            `Click the button below to start your private session. Good luck! 🚀`;

        await bot.sendMessage(channelId, invitation, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🚀 START QUIZ NOW', url: startLink }]] },
        });

        await supabaseAdmin.from('quiz_sets').update({ is_published: true, status: 'ongoing' }).eq('id', setId);

        // Schedule automatic podium broadcast after all questions have had time to be answered
        const waitMs = ((count ?? 0) * 15_000) + 60_000;
        console.log(`[Podium] Scheduled for "${targetSetName}" in ${waitMs / 1000}s`);

        setTimeout(async () => {
            const adminSecret = process.env.ADMIN_PASSWORD;
            if (!adminSecret) { console.error('[Podium] ADMIN_PASSWORD not set — cannot auto-trigger.'); return; }
            try {
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/quizzes/sequence`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
                    body: JSON.stringify({ setId, action: 'broadcast_winners' }),
                });
            } catch (err) {
                console.error('[Podium] Auto-trigger failed:', err);
            }
        }, waitMs);

        return successResponse();
    } catch (error) {
        return serverErrorResponse(error);
    }
}
