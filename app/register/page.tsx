'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * TELEGRAM WEBAPP INTERFACE
 * Provides type safety for the 'window.Telegram.WebApp' global object.
 */
interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    initDataUnsafe?: {
        user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
        };
    };
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

/**
 * STUDENT REGISTRATION PAGE
 * Collects student details and links them to their Telegram ID via a secure WebApp interface.
 */
export default function RegisterPage() {
    // --- STATE ---
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [tid, setTid] = useState<string | null>(null);

    const searchParams = useSearchParams();

    // --- TELEGRAM IDENTITY DETECTION ---
    useEffect(() => {
        const resolveTid = () => {
            // 1. Primary Source: URL Search Parameters (?tid=...)
            let detectedTid = searchParams.get('tid');

            // 2. Secondary Source: Telegram WebApp Initialization Data
            const webApp = window.Telegram?.WebApp;
            if (!detectedTid && webApp?.initDataUnsafe?.user?.id) {
                detectedTid = webApp.initDataUnsafe.user.id.toString();
            }

            if (detectedTid) {
                setTid(detectedTid);
                setChecking(false);
            } else {
                // 3. Fallback: Delay for asynchronous WebApp injection on older clients
                setTimeout(() => {
                    const lateTid = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
                    if (lateTid) {
                        setTid(lateTid);
                    }
                    setChecking(false);
                }, 1000);
            }

            // Signal to Telegram that the UI is ready and should be expanded
            if (webApp) {
                webApp.ready();
                webApp.expand();
            }
        };

        resolveTid();
    }, [searchParams]);

    // --- FORM SUBMISSION ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!tid) {
            console.error('[Registration] Missing Telegram ID');
            return alert('Error: Telegram ID not found. Please open this link via the Telegram Bot.');
        }

        setLoading(true);
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tid,
                    fullName,
                    phoneNumber,
                }),
            });

            const data = await response.json();

            if (data.ok) {
                // Return control to the bot by closing the WebApp view
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                } else {
                    alert('Registration successful! You can now close this window.');
                }
            } else {
                alert(`Error: ${data.error || 'Registration failed'}`);
            }
        } catch (err) {
            console.error('[Registration] Network Error:', err);
            alert('A network error occurred. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [tid, fullName, phoneNumber]);

    // --- RENDER STATES ---

    // State 1: Verification Pending
    if (checking) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-400 font-medium">Verifying your Telegram identity...</p>
                </div>
            </div>
        );
    }

    // State 2: Missing Identity (External Browser Access)
    if (!tid) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md shadow-lg shadow-red-500/5">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
                    <p className="text-zinc-400 mb-6">
                        This registration page can only be accessed through the **E-Class Telegram Bot**.
                    </p>
                    <p className="text-sm text-zinc-500">
                        Please go back to the bot and click the **"Register Now"** button.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 text-xs text-zinc-500 underline hover:text-zinc-300 transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // State 3: Registration Form (Authorized Access)
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-left">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                    Student Registration
                </h1>
                <p className="text-zinc-400 mb-8 font-medium">Please enter your details to get started.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-zinc-300">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-zinc-600"
                            placeholder="Enter your full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-zinc-300">Phone Number</label>
                        <input
                            type="tel"
                            required
                            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-zinc-600"
                            placeholder="Enter your phone number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mt-2"
                    >
                        {loading ? 'Processing...' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
}
