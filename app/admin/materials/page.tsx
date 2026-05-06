'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, Upload, Trash2, FileText, Plus, X } from 'lucide-react';

/**
 * DATA INTERFACES
 */
interface Material {
    id: string;
    title: string;
    category: string;
    file_url: string;
    created_at: string;
}

/**
 * HELPER: GOOGLE DRIVE LINK CONVERTER
 * Converts a standard 'share' link into a 'direct download' link 
 * for compatibility with PDF viewers and downloaders.
 */
function convertDriveLink(url: string): string {
    const match = url.match(/\/d\/([\w-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
}

/**
 * MATERIALS LIBRARY PAGE
 * Manages educational PDF resources, supporting both direct uploads to 
 * Supabase Storage and external Google Drive links.
 */
export default function MaterialsPage() {
    // --- STATE ---
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ title: '', category: '' });
    const [file, setFile] = useState<File | null>(null);
    const [driveUrl, setDriveUrl] = useState('');

    // --- DATA FETCHING ---
    const fetchMaterials = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setMaterials(data);
            }
        } catch (err) {
            console.error('[Materials] Fetch Error:', err);
        }
    }, []);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    // --- ACTIONS ---
    /**
     * Handles both local file upload and Drive link submission.
     * Enforces file size (10MB) and type (PDF) restrictions.
     */
    const handleUpload = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMaterial.title || !newMaterial.category) {
            return alert('Please fill title and category');
        }
        if (!file && !driveUrl) {
            return alert('Please upload a file or provide a Google Drive link');
        }

        setLoading(true);
        let finalUrl = '';

        try {
            if (file) {
                // 1. Hardened File Restrictions
                const MAX_SIZE = 10 * 1024 * 1024; // 10MB
                if (file.size > MAX_SIZE) {
                    alert('File is too large! Maximum size allowed is 10MB.');
                    setLoading(false);
                    return;
                }

                if (file.type !== 'application/pdf') {
                    alert('Only PDF files are allowed!');
                    setLoading(false);
                    return;
                }

                // 2. Generate Unique File Path
                const fileExt = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const filePath = `materials/${fileName}`;

                // 3. Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('materials')
                    .upload(filePath, file);

                if (uploadError) {
                    alert('Error uploading file: ' + uploadError.message);
                    setLoading(false);
                    return;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('materials')
                    .getPublicUrl(filePath);

                finalUrl = publicUrl;
            } else if (driveUrl) {
                finalUrl = convertDriveLink(driveUrl);
            }

            // 4. Save Metadata to Database
            const { error: dbError } = await supabase.from('materials').insert([
                {
                    title: newMaterial.title,
                    category: newMaterial.category,
                    file_url: finalUrl
                }
            ]);

            if (dbError) {
                alert('Error saving to database: ' + dbError.message);
            } else {
                setShowUpload(false);
                setNewMaterial({ title: '', category: '' });
                setFile(null);
                setDriveUrl('');
                fetchMaterials();
            }
        } catch (err) {
            console.error('[Materials] Upload Error:', err);
        } finally {
            setLoading(false);
        }
    }, [newMaterial, file, driveUrl, fetchMaterials]);

    const deleteMaterial = useCallback(async (id: string, url: string) => {
        if (!confirm('Are you sure you want to delete this material?')) return;

        setLoading(true);
        try {
            // Attempt to delete from storage if it's a Supabase hosted file
            if (url.includes('/storage/v1/object/public/')) {
                const urlParts = url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                await supabase.storage.from('materials').remove([`materials/${fileName}`]);
            }

            // Delete from Database
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) alert(error.message);

            fetchMaterials();
        } finally {
            setLoading(false);
        }
    }, [fetchMaterials]);

    // --- RENDER ---
    return (
        <div className="space-y-8 relative">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-[#111111] border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BookOpen className="text-blue-500" size={32} />
                        Materials Library
                    </h2>
                    <p className="text-zinc-500 mt-1">Manage educational PDF resources.</p>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                    <Plus size={20} />
                    Add New Tute
                </button>
            </div>

            {/* UPLOAD MODAL */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Upload New Material</h3>
                            <button onClick={() => setShowUpload(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-400">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="e.g. Mechanics - Lesson 01"
                                    value={newMaterial.title}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-400">Category</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="e.g. Physics"
                                    value={newMaterial.category}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                                />
                            </div>
                            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-all group">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    id="file-upload"
                                    disabled={!!driveUrl}
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="file-upload" className={`cursor-pointer ${driveUrl ? 'opacity-20 cursor-not-allowed' : ''}`}>
                                    <Upload className="mx-auto text-zinc-600 mb-4 group-hover:text-blue-500 transition-colors" size={48} />
                                    <p className="text-zinc-400">{file ? file.name : 'Select or drop PDF file'}</p>
                                </label>
                            </div>

                            <div className="relative flex items-center gap-4">
                                <div className="flex-1 h-px bg-zinc-800"></div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">OR</span>
                                <div className="flex-1 h-px bg-zinc-800"></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-400">Google Drive URL</label>
                                <input
                                    type="url"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="https://drive.google.com/file/d/..."
                                    disabled={!!file}
                                    value={driveUrl}
                                    onChange={(e) => setDriveUrl(e.target.value)}
                                />
                                <p className="text-[10px] text-zinc-500 mt-2">Make sure the file is shared as <b>"Anyone with the link"</b>.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Save Material'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MATERIALS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((m) => (
                    <div key={m.id} className="bg-[#111111] border border-zinc-800 p-5 rounded-2xl group hover:border-blue-500/30 transition-all shadow-lg hover:shadow-blue-500/5">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400">
                                <FileText size={24} />
                            </div>
                            <button
                                onClick={() => deleteMaterial(m.id, m.file_url)}
                                className="text-zinc-600 hover:text-red-500 transition-colors p-2"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                            {m.title}
                        </h4>
                        <span className="text-xs font-semibold px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full uppercase tracking-widest leading-relaxed">
                            {m.category}
                        </span>
                        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                            <p className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleDateString()}</p>
                            <a
                                href={m.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-blue-500 hover:underline"
                            >
                                View PDF
                            </a>
                        </div>
                    </div>
                ))}

                {/* EMPTY STATE */}
                {materials.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-[#111111] border border-dashed border-zinc-800 rounded-3xl">
                        <FileText size={48} className="text-zinc-800 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-500">No Materials Uploaded</h3>
                        <p className="text-zinc-600">Start by adding your first educational resource.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
