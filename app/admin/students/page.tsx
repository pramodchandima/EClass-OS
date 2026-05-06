'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
    id: string;
    telegram_id: number;
    full_name: string;
    phone_number: string;
    joined_at: string;
}

/** Admin Students Directory — real-time list with client-side search. */
export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [search, setSearch]     = useState('');
    const [loading, setLoading]   = useState(true);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('joined_at', { ascending: false });

            if (error) {
                console.error('[Students] Fetch error:', error);
                toast.error('Failed to load students list');
            } else if (data) setStudents(data);
        } catch (err) {
            console.error('[Students] Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStudents();

        // Live-sync: refresh the list whenever any student row changes
        const channel = supabase
            .channel('students_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchStudents)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchStudents]);

    // Client-side filter — recomputed only when students or search changes
    const filteredStudents = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return students;
        return students.filter(s =>
            s.full_name.toLowerCase().includes(q) || s.phone_number.includes(q)
        );
    }, [students, search]);

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-[#111111] border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="text-purple-500" size={32} />
                        Students Directory
                    </h2>
                    <p className="text-zinc-500 mt-1">Manage and view all registered students.</p>
                </div>
                <div className="text-right">
                    <p className="text-zinc-500 text-sm">Total Students</p>
                    <p className="text-3xl font-mono font-bold text-purple-400">{students.length}</p>
                </div>
            </div>

            {/* SEARCH & REFRESH */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="search"
                        placeholder="Search by name or phone..."
                        className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-inner"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchStudents}
                    disabled={loading}
                    className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl border border-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* DATA TABLE */}
            <div className="overflow-hidden border border-zinc-800 rounded-2xl bg-[#111111] shadow-2xl backdrop-blur-md">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-400 text-sm">
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Full Name</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Telegram ID</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Phone Number</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Joined At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {filteredStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-zinc-800/20 text-zinc-300 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">{student.full_name}</td>
                                <td className="px-6 py-4 font-mono text-zinc-500">{student.telegram_id}</td>
                                <td className="px-6 py-4">{student.phone_number}</td>
                                <td className="px-6 py-4 text-sm text-zinc-500">
                                    {new Date(student.joined_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {filteredStudents.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 italic">
                                    {loading ? 'Fetching students...' : 'No students found matching your search.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
