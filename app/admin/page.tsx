'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, Clock, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DashboardStats {
    students: number;
    materials: number;
    polls: number;
}

/**
 * Admin Dashboard Hub
 * Loads three Supabase count queries in parallel for fast initial render.
 */
export default function AdminDashboard() {
    const [stats, setStats]   = useState<DashboardStats>({ students: 0, materials: 0, polls: 0 });
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const [{ count: studentCount }, { count: materialCount }, { count: pollCount }] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('materials').select('*', { count: 'exact', head: true }),
                supabase.from('polls').select('*', { count: 'exact', head: true }),
            ]);

            setStats({
                students:  studentCount  ?? 0,
                materials: materialCount ?? 0,
                polls:     pollCount     ?? 0,
            });
        } catch (err) {
            console.error('[Dashboard] Stats fetch failed:', err);
            toast.error('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const cards = useMemo(() => [
        { title: 'Total Students',    value: stats.students,  icon: Users,     color: 'text-purple-500', href: '/admin/students', description: 'Registered users across all programs.' },
        { title: 'Materials',         value: stats.materials, icon: BookOpen,  color: 'text-blue-500',   href: '/admin/materials', description: 'PDF resources and study guides.' },
        { title: 'Scheduled Quizzes', value: stats.polls,     icon: Clock,     color: 'text-orange-500', href: '/admin/quizzes', description: 'Future and active quiz sessions.' },
    ], [stats]);

    return (
        <div className="space-y-10">
            {/* HERO SECTION */}
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy size={120} className="text-purple-500" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white mb-2">Welcome, Admin!</h2>
                    <p className="text-zinc-400 text-lg max-w-xl font-medium leading-relaxed">
                        You are managing the **E-Class Educational System**. Monitor student progress, distribute materials, and run live quizzes from this portal.
                    </p>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cards.map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="bg-[#111111] border border-zinc-800 p-8 rounded-3xl hover:border-zinc-700 transition-all group shadow-lg hover:shadow-zinc-800/10 active:scale-[0.98]"
                    >
                        <div className={`p-4 rounded-2xl bg-zinc-900 inline-block mb-6 group-hover:scale-110 transition-transform ${card.color} shadow-inner`}>
                            <card.icon size={32} />
                        </div>
                        <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1">{card.title}</h3>
                        <p className="text-4xl font-black text-white mb-4">
                            {loading ? '...' : card.value}
                        </p>
                        <div className="flex items-center gap-2 text-zinc-500 group-hover:text-white text-sm font-semibold transition-colors">
                            Manage Items <ArrowRight size={16} />
                        </div>
                    </Link>
                ))}
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-[#111111] border border-zinc-800 rounded-3xl p-8 shadow-inner">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Trophy className="text-yellow-500" size={24} />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/admin/quizzes" className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-between group active:scale-[0.99]">
                        <span className="text-zinc-300 font-semibold group-hover:text-white">Publish New Quiz</span>
                        <Clock className="text-orange-500" size={20} />
                    </Link>
                    <Link href="/admin/materials" className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-between group active:scale-[0.99]">
                        <span className="text-zinc-300 font-semibold group-hover:text-white">Upload Tutes</span>
                        <BookOpen className="text-blue-500" size={20} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
