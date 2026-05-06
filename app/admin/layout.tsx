'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, BookOpen, Clock, LayoutDashboard, Trophy, LucideIcon, LogOut } from 'lucide-react';

/**
 * NAVIGATION INTERFACES
 */
interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
}

/**
 * SHARED ADMIN LAYOUT
 * Provides a persistent sidebar navigation and standardized content area for the 
 * administrative portal.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // --- MEMOIZED NAVIGATION CONFIGURATION ---
    const navItems = useMemo<NavItem[]>(() => [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Students', href: '/admin/students', icon: Users },
        { name: 'Materials', href: '/admin/materials', icon: BookOpen },
        { name: 'Quiz Scheduler', href: '/admin/quizzes', icon: Clock },
        { name: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy },
    ], []);

    // --- RENDER ---
    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-zinc-100">
            {/* SIDEBAR NAVIGATION */}
            <aside className="w-64 border-r border-zinc-800 bg-[#0d0d0d] p-6 flex flex-col fixed h-full z-20">
                <div className="mb-10 px-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                        E-Class Admin
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">Management Portal v1.0</p>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group active:scale-[0.98] ${isActive
                                        ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(147,51,234,0.1)]'
                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                                    }`}
                            >
                                <item.icon size={18} className={isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                                <span className="font-semibold text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* FOOTER: ACCOUNT INFO */}
                <div className="mt-auto pt-6 border-t border-zinc-800 space-y-3">
                    <div className="px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Authenticated</p>
                        <p className="text-sm font-bold text-zinc-300">Administrator</p>
                    </div>
                    <button 
                        onClick={() => {
                            document.cookie = 'admin_password=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                            window.location.href = '/admin/login';
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all text-sm font-semibold border border-red-500/20 active:scale-[0.98]"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 ml-64 overflow-auto p-8 lg:p-12">
                <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
