'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react';

// Telegram WebApp types are declared globally in register/page.tsx
interface PollData {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
type OptionKey = typeof OPTION_KEYS[number];

/** Spinner reused in multiple places */
const Spinner = () => (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500" />
    </div>
);

function QuizContent() {
    const searchParams = useSearchParams();
    const pollId = searchParams.get('pollId');
    const tid    = searchParams.get('tid');

    const [poll, setPoll]         = useState<PollData | null>(null);
    const [timeLeft, setTimeLeft] = useState(15);
    const [selected, setSelected] = useState<OptionKey | 'NONE' | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [loading, setLoading]   = useState(true);
    const [submitted, setSubmitted] = useState(false);

    // Initial data fetch + Telegram WebApp initialization
    useEffect(() => {
        const webApp = window.Telegram?.WebApp;
        webApp?.ready();
        webApp?.expand();

        if (!pollId) { setLoading(false); return; }

        fetch(`/api/quizzes/detail?id=${pollId}`)
            .then(r => r.json())
            .then(data => { if (data.ok) setPoll(data.poll); })
            .catch(err => console.error('[Quiz] Poll fetch error:', err))
            .finally(() => setLoading(false));
    }, [pollId]);

    // Countdown timer — only runs while a poll is loaded and not yet submitted
    useEffect(() => {
        if (!poll || submitted || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!submitted) handleSelect('NONE'); // auto-submit on timeout
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poll, submitted]);

    const handleSelect = useCallback(async (option: OptionKey | 'NONE') => {
        if (submitted || !poll) return;
        setSelected(option);
        setSubmitted(true);

        const correct = option !== 'NONE' && option === poll.correct_option;
        setIsCorrect(correct);

        try {
            await fetch('/api/quizzes/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pollId, tid, option, timeLeft }),
            });
        } catch (err) {
            console.error('[Quiz] Answer submit error:', err);
        }

        // Give the student 3 seconds to see the result before the app closes
        setTimeout(() => window.Telegram?.WebApp?.close(), 3000);
    }, [submitted, poll, pollId, tid, timeLeft]);

    if (loading) return <Spinner />;
    if (!poll)   return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
            <p className="text-zinc-500 text-lg">Quiz not found or expired.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col p-6 font-sans overflow-hidden">
            {/* Header / Timer */}
            <div className="flex justify-between items-center mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <span className="font-bold text-sm tracking-tight text-zinc-300">LIVE QUIZ</span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-1 rounded-full border ${timeLeft < 5 ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' : 'bg-purple-500/10 border-purple-500/50 text-purple-400'}`}>
                    <Clock size={16} />
                    <span className="font-black text-xl tabular-nums">{timeLeft}s</span>
                </div>
            </div>

            {/* Question */}
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-2xl font-black leading-tight mb-4 text-white">{poll.question_text}</h1>
                <div className="h-1 w-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full" />
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-4 flex-1">
                {OPTION_KEYS.map((opt) => {
                    const text = poll[`option_${opt.toLowerCase()}` as keyof PollData] as string;
                    const isSelected      = selected === opt;
                    const isCorrectOption = poll.correct_option === opt;

                    let bgClass = 'bg-zinc-900 border-zinc-800 active:scale-95 hover:border-zinc-600 transition-all';
                    let icon: React.ReactNode = null;

                    if (submitted) {
                        if (isSelected && isCorrect)  { bgClass = 'bg-green-500/20 border-green-500 scale-[1.02] shadow-[0_0_20px_rgba(34,197,94,0.3)]'; icon = <CheckCircle2 className="text-green-500" size={24} />; }
                        else if (isSelected)          { bgClass = 'bg-red-500/20 border-red-500 scale-[0.98]'; icon = <XCircle className="text-red-500" size={24} />; }
                        else if (isCorrectOption)     { bgClass = 'bg-green-500/10 border-green-500/50'; }
                        else                          { bgClass = 'bg-zinc-900/30 border-zinc-900 opacity-50'; }
                    }

                    return (
                        <button
                            key={opt}
                            disabled={submitted}
                            onClick={() => handleSelect(opt)}
                            className={`relative text-left p-6 rounded-2xl border-2 flex items-center justify-between group transition-all duration-300 ${bgClass}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border-2 ${isSelected ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                    {opt}
                                </span>
                                <span className="font-bold text-lg">{text}</span>
                            </div>
                            {icon}
                        </button>
                    );
                })}
            </div>

            {/* Result Overlay */}
            {submitted && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 animate-in fade-in zoom-in duration-500">
                    {isCorrect
                        ? <div className="bg-green-500 text-white p-8 rounded-full shadow-[0_0_100px_rgba(34,197,94,0.6)] animate-bounce font-black text-3xl">🎉 WELL DONE!</div>
                        : <div className="bg-red-500 text-white p-8 rounded-full shadow-[0_0_100px_rgba(239,44,44,0.4)] font-black text-3xl">❌ WRONG!</div>
                    }
                </div>
            )}
        </div>
    );
}

export default function QuizPage() {
    return (
        <Suspense fallback={<Spinner />}>
            <QuizContent />
        </Suspense>
    );
}
