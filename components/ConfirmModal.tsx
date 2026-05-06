'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}: ConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-[#0d0d0d] border border-zinc-800 rounded-3xl p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Background Glow */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${
                            type === 'danger' ? 'bg-red-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
                        }`} />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`p-3 rounded-2xl ${
                                    type === 'danger' ? 'bg-red-500/10 text-red-500' : type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                    <AlertTriangle size={28} />
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h3>
                            <p className="text-zinc-400 font-medium leading-relaxed mb-8">{message}</p>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-6 py-3.5 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-900 hover:text-white transition-all text-sm uppercase tracking-widest"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onCancel();
                                    }}
                                    className={`flex-1 px-6 py-3.5 rounded-xl font-black text-white shadow-xl transform active:scale-[0.98] transition-all text-sm uppercase tracking-widest ${
                                        type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 
                                        type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20' : 
                                        'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                                    }`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
