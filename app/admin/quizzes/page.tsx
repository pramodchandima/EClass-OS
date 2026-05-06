'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Clock,
    Plus,
    Send,
    CheckCircle2,
    Trash2,
    LayoutList,
    ListPlus,
    Loader2
} from 'lucide-react';

/**
 * DATA INTERFACES
 */
interface QuizSet {
    id: string;
    name: string;
    scheduled_at: string;
    status: 'scheduled' | 'ongoing' | 'completed';
    created_at: string;
}

interface Poll {
    id: string;
    question_text: string;
    is_published: boolean;
    scheduled_for: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    quiz_set_id: string;
    quiz_set_name: string;
    order_index: number;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
}

interface DraftPoll {
    question_text: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct_option?: string;
    quiz_set_id: string;
    order_index: number;
}

/**
 * ADMIN QUIZ MANAGEMENT DASHBOARD
 * Handles batch creation of quiz sets and questions, with automated sequence control.
 */
export default function QuizzesPage() {
    // --- STATE ---
    const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState<boolean | string>(false);
    const [showCreateSet, setShowCreateSet] = useState(false);
    const [showBatchEntry, setShowBatchEntry] = useState(false);
    const [selectedSetId, setSelectedSetId] = useState<string>('');

    const [setFormData, setSetFormData] = useState({
        name: '',
        scheduled_at: ''
    });

    const [batchText, setBatchText] = useState('');

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: sets } = await supabase
                .from('quiz_sets')
                .select('*')
                .order('scheduled_at', { ascending: false });

            const { data: qls } = await supabase
                .from('polls')
                .select('*')
                .order('order_index', { ascending: true });

            if (sets) setQuizSets(sets);
            if (qls) setPolls(qls);
        } catch (err) {
            console.error('Failed to fetch quizzes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- PERFORMANCE: POLL GROUPING (O(N)) ---
    /**
     * Pre-groups polls by their quiz_set_id to avoid O(N^2) filtering in the render loop.
     */
    const groupedPolls = useMemo(() => {
        const groups: Record<string, Poll[]> = {};
        polls.forEach(p => {
            if (!groups[p.quiz_set_id]) groups[p.quiz_set_id] = [];
            groups[p.quiz_set_id].push(p);
        });
        return groups;
    }, [polls]);

    // --- ACTIONS ---
    const handleCreateSet = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('quiz_sets').insert([setFormData]);
            if (error) {
                alert(error.message);
            } else {
                setShowCreateSet(false);
                setSetFormData({ name: '', scheduled_at: '' });
                fetchData();
            }
        } finally {
            setLoading(false);
        }
    }, [setFormData, fetchData]);

    /**
     * Parses raw text into structured poll objects.
     * Expects: Question \n A) ... \n B) ... \n C) ... \n D) ... \n Correct: A
     */
    const handleBatchSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSetId) return alert('Please select a Quiz Set first.');
        setLoading(true);

        const lines = batchText.split('\n').map(l => l.trim()).filter(l => l !== '');
        const quizzes: DraftPoll[] = [];
        let currentQuiz: Partial<DraftPoll> | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match Option: A) ...
            if (line.match(/^[ABCD]\)/i)) {
                const optKey = line[0].toLowerCase() as 'a' | 'b' | 'c' | 'd';
                if (currentQuiz) {
                    currentQuiz[`option_${optKey}`] = line.substring(2).trim();
                }
            }
            // Match Correct Answer: Correct: A
            else if (line.toLowerCase().startsWith('correct:')) {
                if (currentQuiz) {
                    currentQuiz.correct_option = line.split(':')[1].trim().toUpperCase();
                    quizzes.push({
                        ...currentQuiz as DraftPoll,
                        quiz_set_id: selectedSetId,
                        order_index: quizzes.length + 1
                    });
                    currentQuiz = null;
                }
            }
            // Otherwise, it's part of the Question text
            else {
                if (!currentQuiz) {
                    currentQuiz = { question_text: line };
                } else {
                    currentQuiz.question_text += ' ' + line;
                }
            }
        }

        if (quizzes.length > 0) {
            const { error } = await supabase.from('polls').insert(quizzes);
            if (error) {
                alert(error.message);
            } else {
                setShowBatchEntry(false);
                setBatchText('');
                fetchData();
            }
        } else {
            alert('No valid quizzes found. Check format:\n\nQuestion?\nA) opt\nB) opt\nC) opt\nD) opt\nCorrect: A');
        }
        setLoading(false);
    }, [selectedSetId, batchText, fetchData]);

    const handleDeleteSet = useCallback(async (id: string) => {
        if (!confirm('Delete this set and all its quizzes?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('quiz_sets').delete().eq('id', id);
            if (error) alert(error.message);
            fetchData();
        } finally {
            setLoading(false);
        }
    }, [fetchData]);

    const handleAutoPlay = useCallback(async (setId: string) => {
        const set = quizSets.find(s => s.id === setId);
        if (!set) return;
        if (!confirm(`Start Auto-play for ${set.name}?`)) return;

        setLoading(setId);
        try {
            const res = await fetch('/api/quizzes/sequence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId }),
            });
            const data = await res.json();
            if (data.ok) alert('Quiz Set completed!');
            else alert('Error: ' + data.error);
        } catch (err) {
            alert('Failed to start the sequence.');
        } finally {
            setLoading(false);
            fetchData();
        }
    }, [quizSets, fetchData]);

    // --- RENDER ---
    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-[#111111] border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Clock className="text-orange-500" size={32} />
                        Quiz Management
                    </h2>
                    <p className="text-zinc-500 mt-1">Batch schedule and manage automated quiz sets.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowBatchEntry(true)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        <ListPlus size={20} />
                        Batch Entry
                    </button>
                    <button
                        onClick={() => setShowCreateSet(true)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                    >
                        <Plus size={20} />
                        New Quiz Set
                    </button>
                </div>
            </div>

            {/* MODAL: CREATE SET */}
            {showCreateSet && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Create New Quiz Set</h3>
                            <button onClick={() => setShowCreateSet(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSet} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-zinc-400">Set Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    placeholder="e.g. Physics Weekly 15"
                                    value={setFormData.name}
                                    onChange={(e) => setSetFormData({ ...setFormData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-zinc-400">Scheduled At</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    value={setFormData.scheduled_at}
                                    onChange={(e) => setSetFormData({ ...setFormData, scheduled_at: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading === true}
                                className="w-full bg-orange-600 hover:bg-orange-500 font-bold py-3 rounded-xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-4"
                            >
                                {loading === true ? 'Saving...' : 'Create Set'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: BATCH ENTRY */}
            {showBatchEntry && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Batch Quiz Entry</h3>
                            <button onClick={() => setShowBatchEntry(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleBatchSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-zinc-400">Select Quiz Set</label>
                                <select
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    value={selectedSetId}
                                    onChange={(e) => setSelectedSetId(e.target.value)}
                                >
                                    <option value="">-- Choose Set --</option>
                                    {quizSets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-zinc-400">Format: Question, Then Options A-D, Then Correct Option</label>
                                <textarea
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono text-sm"
                                    rows={10}
                                    placeholder={`What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6\nCorrect: B\n\nNext Question...`}
                                    value={batchText}
                                    onChange={(e) => setBatchText(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading === true || !selectedSetId}
                                className="w-full bg-orange-600 hover:bg-orange-500 font-bold py-3 rounded-xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-4"
                            >
                                {loading === true ? 'Processing...' : 'Upload All Quizzes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* QUIZ SET LIST */}
            <div className="space-y-8">
                {quizSets.map((set) => {
                    const setPolls = groupedPolls[set.id] || [];

                    return (
                        <div key={set.id} className="bg-[#111111] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg group hover:border-zinc-700 transition-all">
                            <div className="p-6 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${set.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        <LayoutList size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{set.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {new Date(set.scheduled_at).toLocaleString()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold uppercase tracking-wider">
                                                {set.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {set.status === 'scheduled' && (
                                        <button
                                            onClick={() => handleAutoPlay(set.id)}
                                            disabled={!!loading}
                                            className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading === set.id ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                            Run Now
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteSet(set.id)}
                                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {setPolls.map((poll) => (
                                    <div key={poll.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                                                    Q{poll.order_index}
                                                </span>
                                                {poll.is_published && <CheckCircle2 size={14} className="text-green-500" />}
                                            </div>
                                            <h4 className="text-sm font-semibold text-zinc-200 line-clamp-2 mb-2">
                                                {poll.question_text}
                                            </h4>
                                        </div>
                                        <div className="text-[10px] font-mono text-zinc-500">
                                            Correct: <span className="text-orange-500">{poll.correct_option}</span>
                                        </div>
                                    </div>
                                ))}
                                {setPolls.length === 0 && (
                                    <div className="col-span-full py-10 text-center text-zinc-600 italic">
                                        No quizzes in this set yet. Use Batch Entry to add some.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {quizSets.length === 0 && (
                    <div className="text-center py-20 bg-[#111111] border border-dashed border-zinc-800 rounded-3xl">
                        <Clock size={48} className="text-zinc-800 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-500">No Quiz Sets Scheduled</h3>
                        <p className="text-zinc-600">Create a quiz set and add questions to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
