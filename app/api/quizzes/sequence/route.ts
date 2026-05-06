import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bot from '@/lib/telegram';
import { generateAnswerKey } from '@/lib/pdfGenerator';
import {
    validateAdminSecret,
    validateAdminCookie,
    unauthorizedResponse,
    successResponse,
    serverErrorResponse
} from '@/lib/api-utils';

/**
 * INTERNAL TYPES
 */
type SequenceAction = 'broadcast_winners' | 'initiate_quiz' | undefined;

interface AnswerWithStudent {
    earned_points: number;
    student_id: string;
    students: {
        full_name: string;
    };
}

/**
 * SEQUENTIAL QUIZ SESSION RUNNER
 * Handles the lifecycle of a mass quiz session:
 * 1. Broadcasts an invitation to the official channel with a deep-link.
 * 2. Processes automated podium triggers to announce the Top 3 performers.
 * 3. Generates and publishes the bilingual Answer Key PDF.
 */
export async function POST(req: NextRequest) {
    try {
        // 🔒 SECURITY: Unified Admin Validation (Headers + Cookies)
        if (!validateAdminSecret(req) && !validateAdminCookie(req)) {
            return unauthorizedResponse();
        }

        const body = await req.json();
        const { setId, setName, action } = body as { setId?: string; setName?: string; action?: SequenceAction };

        const targetSetId = setId;
        let targetSetName = setName;
        const channelId = process.env.TELEGRAM_CHANNEL_ID;

        if (!targetSetId || !channelId) {
            throw new Error('Mandatory context (Set ID or Channel ID) is missing.');
        }

        // 1. Resolve Set Name if missing
        if (!targetSetName) {
            const { data } = await supabaseAdmin.from('quiz_sets').select('name').eq('id', targetSetId).single();
            targetSetName = data?.name || 'Untitled Quiz';
        }

        // 🏆 ACTION: BROADCAST WINNERS & PODIUM
        if (action === 'broadcast_winners') {
            /**
             * AGGREGATED SCORE QUERY
             * We fetch all correct answers for this specific quiz set and 
             * aggregate them by student in-memory to resolve the Top 3 performers.
             */
            const { data: answers, error: resError } = await supabaseAdmin
                .from('poll_answers')
                .select(`
                    earned_points,
                    student_id,
                    students (
                        full_name
                    ),
                    polls!inner (
                        quiz_set_id
                    )
                `)
                .eq('polls.quiz_set_id', targetSetId);

            if (resError || !answers) {
                console.error('[Podium] Database Error:', resError);
                throw new Error('Could not calculate podium results from database.');
            }

            // Aggregate results in memory: { [student_id]: { name, pts } }
            const scoreMap: Record<string, { name: string; pts: number }> = {};

            (answers as unknown as any[]).forEach((ans: any) => {
                const sId = ans.student_id;
                const sName = ans.students?.full_name || 'Anonymous Student';
                const pts = ans.earned_points || 0;

                if (!scoreMap[sId]) {
                    scoreMap[sId] = { name: sName, pts: 0 };
                }
                scoreMap[sId].pts += pts;
            });

            // Sort and take Top 3
            const sortedWinners = Object.values(scoreMap)
                .sort((a, b) => b.pts - a.pts)
                .slice(0, 3);

            if (sortedWinners.length === 0) return successResponse();

            const medals = ['🥇', '🥈', '🥉'];
            let podium = `🏆 *THE WINNERS PODIUM* 🏆\n\nSession: *${targetSetName}*\n\n`;

            sortedWinners.forEach((s, i) => {
                podium += `${medals[i] || '🎖️'} *${s.name}* — ${s.pts} Points\n`;
            });

            podium += `\n🌟 Congratulations to everyone who participated!`;
            await bot.sendMessage(channelId, podium, { parse_mode: 'Markdown' });

            // 📄 AUTOMATED PDF SYNTHESIS
            try {
                const { data: allPolls } = await supabaseAdmin
                    .from('polls')
                    .select('*')
                    .eq('quiz_set_id', targetSetId)
                    .order('order_index', { ascending: true });

                if (allPolls && allPolls.length > 0) {
                    const safeSetName = targetSetName || 'Quiz Results';
                    const pdfBuffer = await generateAnswerKey(safeSetName, allPolls);

                    await bot.sendDocument(channelId, pdfBuffer, {
                        caption: `📚 *OFFICIAL ANSWER KEY & REVIEW SHEET*\n\nTopic: *${targetSetName}*\nQuestions: *${allPolls.length}*\n\nUse this to review your performance and prepare for next time! 🎓💎`,
                        parse_mode: 'Markdown'
                    }, { filename: `${safeSetName.replace(/\s+/g, '_')}_Answers.pdf` });
                }
            } catch (pdfErr) {
                console.error('[Sequence] Automated PDF publication failed:', pdfErr);
            }

            // Update Set Status
            await supabaseAdmin.from('quiz_sets').update({ status: 'completed' }).eq('id', targetSetId);
            return successResponse();
        }

        // 🚀 ACTION: BROADCAST INVITATION (Default)
        const { count } = await supabaseAdmin
            .from('polls')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_set_id', targetSetId);

        const botInfo = await bot.getMe();
        const startLink = `https://t.me/${botInfo.username}?start=quizset_${targetSetId}`;

        const invitation = `🌟 *NEW QUIZ SESSION IS LIVE!* 🌟\n\n` +
            `📚 Topic: *${targetSetName}*\n` +
            `🔢 Questions: *${count || 0}*\n` +
            `⏱️ Time Limit: *15s per Question*\n\n` +
            `Click the button below to start your private session. Good luck! 🚀`;

        await bot.sendMessage(channelId, invitation, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 START QUIZ NOW", url: startLink }]
                ]
            }
        });

        await supabaseAdmin.from('quiz_sets').update({ is_published: true, status: 'ongoing' }).eq('id', targetSetId);

        // 🕒 AUTOMATIC PODIUM SCHEDULING (Background)
        const totalQuestions = count ?? 0;
        const currentSetName = targetSetName ?? 'Ongoing Quiz';
        const waitTimeMs = (totalQuestions * 15000) + 60000;

        console.log(`[Podium] Automated broadcast scheduled for ${currentSetName} in ${waitTimeMs / 1000}s`);

        setTimeout(async () => {
            try {
                const adminSecret = process.env.ADMIN_PASSWORD;
                if (!adminSecret) throw new Error('ADMIN_PASSWORD not configured');

                // Self-trigger the winners broadcast with security header
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/quizzes/sequence`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-secret': adminSecret
                    },
                    body: JSON.stringify({ setId: targetSetId, action: 'broadcast_winners' })
                });
            } catch (err) {
                console.error(`[Podium] Automated trigger failed:`, err);
            }
        }, waitTimeMs);

        return successResponse();

    } catch (error: any) {
        return serverErrorResponse(error);
    }
}
