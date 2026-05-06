import Link from 'next/link';
import { Bot, ShieldCheck, GraduationCap, ArrowRight } from 'lucide-react';

/**
 * ROOT LANDING PAGE
 * Provides a premium, high-aesthetic entry point for the E-Class ecosystem.
 * Acts as a traffic controller between the Student-facing Bot and the Admin Portal.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">

      {/* AMBIENT BACKGROUND GLOW */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px]" />
      </div>

      <main className="max-w-4xl w-full text-center relative z-10 space-y-12 py-20">

        {/* BRANDING */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-5 rounded-3xl mb-8 shadow-2xl shadow-purple-500/20 transform hover:rotate-3 transition-transform">
            <GraduationCap size={48} className="text-white" />
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tightest mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            E-CLASS OS
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            The next-generation educational ecosystem.
            Interactive quizzes, study materials, and real-time performance tracking—all inside **Telegram**.
          </p>
        </div>

        {/* NAVIGATION PORTALS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">

          {/* BOT PORTAL */}
          <a
            href="https://t.me/eclasswbot"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-[#111111] border border-zinc-800 p-8 rounded-3xl hover:border-zinc-500 transition-all shadow-xl hover:shadow-zinc-500/5 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-zinc-900 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                <Bot size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Open Telegram Bot</h3>
                <p className="text-sm text-zinc-500">Access quizzes and materials directly.</p>
              </div>
              <ArrowRight size={20} className="mt-2 text-zinc-700 group-hover:text-white group-hover:translate-x-2 transition-all" />
            </div>
          </a>

          {/* ADMIN PORTAL */}
          <Link
            href="/admin"
            className="group relative bg-[#111111] border border-zinc-800 p-8 rounded-3xl hover:border-zinc-500 transition-all shadow-xl hover:shadow-zinc-500/5 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-zinc-900 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Admin Portal</h3>
                <p className="text-sm text-zinc-500">Manage students, quizzes, and resources.</p>
              </div>
              <ArrowRight size={20} className="mt-2 text-zinc-700 group-hover:text-white group-hover:translate-x-2 transition-all" />
            </div>
          </Link>

        </div>

        {/* FOOTER */}
        <div className="pt-20 opacity-20 hover:opacity-100 transition-opacity duration-1000">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
            Designed & Developed by Pramod
          </p>
        </div>

      </main>

    </div>
  );
}
