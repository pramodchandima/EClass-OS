'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { LeaderboardEntry } from '@/lib/types';
import toast from 'react-hot-toast';

// Pre-defined medal gradient classes for the top 3 positions
const RANK_COLORS = [
    'from-yellow-400 to-amber-600', // 🥇 Gold
    'from-zinc-300 to-zinc-500',    // 🥈 Silver
    'from-orange-400 to-orange-700',// 🥉 Bronze
];

/**
 * Live Leaderboard Page
 * Rankings are sorted server-side. A Supabase realtime subscription
 * triggers a refresh whenever a new poll answer is recorded.
 */
export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading]         = useState(true);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('total_points', { ascending: false });

            if (error) {
                console.error('[Leaderboard] Fetch error:', error);
                toast.error('Failed to load leaderboard data');
            } else if (data) setLeaderboard(data as LeaderboardEntry[]);
        } catch (err) {
            console.error('[Leaderboard] Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();

        // Refresh when any answer is submitted
        const channel = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_answers' }, fetchLeaderboard)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchLeaderboard]);

    // Compute max points once for the relative progress bars
    const maxPoints = leaderboard[0]?.total_points || 1;

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-[#111111] border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        Live Leaderboard
                    </h2>
                    <p className="text-zinc-500 mt-1">Real-time rankings based on quiz performance.</p>
                </div>
                <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-xl border border-yellow-500/20 text-yellow-500">
                    <TrendingUp size={20} className="animate-pulse" />
                    <span className="text-sm font-bold uppercase tracking-wider">Live Updates Active</span>
                </div>
            </div>

            {/* LEADERBOARD LIST */}
            <div className="grid grid-cols-1 gap-4">
                {leaderboard.map((entry, index) => {
                    const isTop3 = index < 3;
                    return (
                        <div
                            key={entry.student_id}
                            className={`bg-[#111111] border border-zinc-800 p-4 rounded-2xl flex items-center gap-6 transition-all hover:scale-[1.01] hover:border-zinc-700 shadow-lg ${isTop3 ? 'ring-1 ring-white/5 bg-zinc-900/50' : ''}`}
                        >
                            {/* RANK BADGE */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black bg-gradient-to-br shadow-inner ${isTop3 ? RANK_COLORS[index] : 'from-zinc-800 to-zinc-900 text-zinc-500'}`}>
                                {index === 0 ? <Medal size={24} className="text-white" /> : index + 1}
                            </div>

                            {/* STUDENT INFO */}
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                    {entry.full_name}
                                    {index === 0 && <Star size={16} className="fill-yellow-400 text-yellow-400" />}
                                </h4>
                                <p className="text-xs text-zinc-500 font-mono tracking-tighter opacity-60">
                                    TELEGRAM ID: {entry.telegram_id}
                                </p>
                            </div>

                            {/* POINTS */}
                            <div className="text-right pr-4">
                                <p className="text-2xl font-black text-white">{entry.total_points}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Points</p>
                            </div>

                            {/* RELATIVE PROGRESS BAR */}
                            <div className="hidden md:block w-32 h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={`h-full bg-gradient-to-r transition-all duration-1000 ${isTop3 ? RANK_COLORS[index] : 'from-purple-600 to-blue-600'}`}
                                    style={{ width: `${Math.min((entry.total_points / maxPoints) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}

                {/* EMPTY STATE */}
                {leaderboard.length === 0 && !loading && (
                    <div className="text-center py-24 text-zinc-600 italic bg-[#111111] border border-dashed border-zinc-800 rounded-3xl">
                        <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">No quiz entries yet. Start a quiz to see the leaderboard!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
