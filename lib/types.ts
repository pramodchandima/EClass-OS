/**
 * CORE DATA INTERFACES
 */

export interface Student {
    id: number;
    telegram_id: number;
    full_name: string;
    phone_number: string;
    created_at: string;
    total_points?: number;
}

export interface LeaderboardEntry {
    student_id: string;
    telegram_id: number;
    full_name: string;
    total_points: number;
}

export interface QuizSet {
    id: string;
    name: string;
    title: string;
    description?: string;
    status: 'draft' | 'scheduled' | 'ongoing' | 'completed';
    scheduled_at?: string;
    is_published: boolean;
    created_at: string;
}

export interface Poll {
    id: string;
    quiz_set_id: string | null;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    order_index: number;
    created_at: string;
}

export interface PollAnswer {
    id: string;
    poll_id: string;
    student_id: number;
    selected_option: 'A' | 'B' | 'C' | 'D';
    time_taken_seconds: number;
    earned_points: number;
    created_at: string;
}

export interface Material {
    id: string;
    title: string;
    category: string;
    file_url: string;
    created_at: string;
}

/**
 * TELEGRAM TYPES
 */
export interface TelegramWebhookPayload {
    message?: {
        chat: { id: number };
        text?: string;
        from: { id: number; first_name?: string };
    };
    callback_query?: {
        id: string;
        data?: string;
        from: { id: number };
        message?: {
            chat: { id: number };
            message_id: number;
            date: number;
        };
    };
}

// ─── Telegram WebApp (Browser Global) ─────────────────────────────────────────

export interface TelegramWebApp {
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
        Telegram?: { WebApp?: TelegramWebApp };
    }
}
