import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface AnswerPayload {
    pollId: string;
    tid: string;
    option: 'A' | 'B' | 'C' | 'D';
    timeLeft: number;
}

/**
 * POST /api/quizzes/answer
 * Records a student's quiz answer and calculates their score.
 *
 * Scoring (15-second rule):
 *  - timeLeft >= 10s  → 10 pts  (max points for fast response)
 *  - timeLeft  < 10s  → floor(timeLeft) pts  (linear decay)
 *  - Wrong answer     → 0 pts
 */
export async function POST(req: NextRequest) {
    try {
        const { pollId, tid, option, timeLeft } = (await req.json()) as AnswerPayload;

        if (!pollId || !tid || !option) {
            return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Resolve student and poll in parallel to minimize latency
        const [studentRes, pollRes] = await Promise.all([
            supabaseAdmin.from('students').select('id').eq('telegram_id', parseInt(tid, 10)).single(),
            supabaseAdmin.from('polls').select('id, correct_option').eq('id', pollId).single(),
        ]);

        const student = studentRes.data;
        const poll = pollRes.data as { id: string; correct_option: string } | null;

        if (!student || !poll) {
            return NextResponse.json({ ok: false, error: 'Student or poll not found.' }, { status: 404 });
        }

        const isCorrect = option === poll.correct_option;
        const points = isCorrect ? (timeLeft >= 10 ? 10 : Math.max(0, Math.floor(timeLeft))) : 0;

        const { error: insertError } = await supabaseAdmin.from('poll_answers').insert([{
            poll_id: pollId,
            student_id: student.id,
            selected_option: option,
            time_taken_seconds: 15 - timeLeft,
            earned_points: points,
        }]);

        if (insertError) {
            // Unique constraint violation = duplicate submission (not a crash-worthy error)
            console.warn(`[Answer API] Duplicate submission: student ${student.id} on poll ${pollId}`);
            return NextResponse.json({ ok: false, error: 'Response already recorded' });
        }

        return NextResponse.json({ ok: true, points });
    } catch (error) {
        console.error('[Answer API] Critical Error:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
