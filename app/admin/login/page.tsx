'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

/**
 * ADMIN LOGIN PAGE
 * Provides a secure entry point for administrators.
 * Sets a persistent session cookie that is verified by the system-wide middleware.
 */
export default function AdminLoginPage() {
    // --- STATE ---
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    // --- LOGIN HANDLER ---
    const handleLogin = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            /**
             * SESSION PERSISTENCE
             * We set the 'admin_password' cookie with strict security attributes.
             * Max-Age is set to 24 hours (86400 seconds).
             */
            const isProd = process.env.NODE_ENV === 'production';
            const cookieAttributes = [
                `admin_password=${password}`,
                'path=/',
                'max-age=86400',
                'SameSite=Strict',
                isProd ? 'Secure' : ''
            ].filter(Boolean).join('; ');

            document.cookie = cookieAttributes;

            // Redirect to the main dashboard
            router.push('/admin');
        } catch (err) {
            console.error('[Admin Login] Critical failure:', err);
        } finally {
            setLoading(false);
        }
    }, [password, router]);

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* BACKGROUND DECORATION */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
            </div>

            {/* LOGIN CARD */}
            <div className="w-full max-w-sm bg-[#0d0d0d] border border-zinc-800 rounded-3xl p-10 shadow-2xl relative z-10 animate-in zoom-in duration-500">
                <div className="flex flex-col items-center mb-10">
                    <div className="bg-purple-600/20 p-4 rounded-2xl mb-4 text-purple-500 shadow-inner">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Admin Secure Login</h1>
                    <p className="text-zinc-500 text-sm mt-2 font-medium">Enter credentials to proceed</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 ml-1">
                            Administrator Key
                        </label>
                        <input
                            type="password"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono placeholder-zinc-700 shadow-inner"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-xl transform active:scale-[0.98] transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'Establish Session'}
                    </button>
                </form>

                {/* VERSION INFO */}
                <div className="mt-10 text-center opacity-30">
                    <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">E-Class OS v1.2</p>
                </div>
            </div>
        </div>
    );
}
