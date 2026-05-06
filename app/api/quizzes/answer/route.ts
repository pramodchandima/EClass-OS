import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * INTERNAL TYPES
 */
interface AnswerPayload {
    pollId: string;
    tid: string;
    option: 'A' | 'B' | 'C' | 'D';
    timeLeft: number;
}

interface Poll {
    id: string;
    correct_option: string;
}

/**
 * QUIZ ANSWER API
 * Standardizes the submission and scoring of individual quiz responses.
 * 
 * SCORING RULES (The Elite 15s Rule):
 * - Time remaining >= 10s: 10 Points (Full points for fast responses)
 * - Time remaining < 10s: Score = Seconds remaining (Linear drop for slower responses)
 * - Incorrect answer: 0 Points
 */
export async function POST(req: NextRequest) {
    try {
        const { pollId, tid, option, timeLeft } = (await req.json()) as AnswerPayload;

        // 1. Resolve Student and Poll context via Parallel Fetch
        const [studentRes, pollRes] = await Promise.all([
            supabaseAdmin.from('students').select('id').eq('telegram_id', parseInt(tid, 10)).single(),
            supabaseAdmin.from('polls').select('*').eq('id', pollId).single()
        ]);

        const student = studentRes.data;
        const poll = pollRes.data as Poll | null;

        if (!student || !poll) {
            throw new Error('Student identity or Poll context not found. Access denied.');
        }

        // 2. Scoring Engine
        const isCorrect = option === poll.correct_option;
        let points = 0;

        if (isCorrect) {
            /** 
             * Rule: 15-10s = 10pts, 10-1s = remaining seconds
             * Note: We use the raw timeLeft provided by the client.
             */
            points = timeLeft >= 10 ? 10 : Math.max(0, Math.floor(timeLeft));
        }

        // 3. Database Persistence
        const { error: insertError } = await supabaseAdmin.from('poll_answers').insert([
            {
                poll_id: pollId,
                student_id: student.id,
                selected_option: option,
                time_taken_seconds: 15 - timeLeft,
                earned_points: points
            }
        ]);

        if (insertError) {
            // Error code P2002 represents a Unique Violation (Duplicate Entry)
            console.warn(`[Answer API] Duplicate submission attempted for student ${student.id} on poll ${pollId}`);
            return NextResponse.json({ ok: false, error: 'Response already recorded' });
        }

        return NextResponse.json({ ok: true, points });
    } catch (error: any) {
        console.error('[Answer API] Critical Error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
