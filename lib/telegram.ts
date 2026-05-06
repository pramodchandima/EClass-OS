import TelegramBot, {
    SendMessageOptions,
    SendDocumentOptions,
    AnswerCallbackQueryOptions,
    EditMessageTextOptions,
    EditMessageReplyMarkupOptions,
} from 'node-telegram-bot-api';
import { telegramQueue } from './telegramQueue';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing from environment variables.');

const rawBot = new TelegramBot(token);

/** Strictly typed, rate-limited wrapper around the Telegram Bot API. */
export interface BotWrapper {
    getMe: () => Promise<TelegramBot.User>;
    sendMessage: (chatId: number | string, text: string, options?: SendMessageOptions) => Promise<TelegramBot.Message>;
    sendDocument: (chatId: number | string, doc: Buffer | string, options?: SendDocumentOptions, fileOptions?: Record<string, string>) => Promise<TelegramBot.Message>;
    sendChatAction: (chatId: number | string, action: TelegramBot.ChatAction) => Promise<boolean>;
    answerCallbackQuery: (id: string, options?: Partial<AnswerCallbackQueryOptions>) => Promise<boolean>;
    editMessageText: (text: string, options?: EditMessageTextOptions) => Promise<TelegramBot.Message | boolean>;
    editMessageReplyMarkup: (markup: TelegramBot.InlineKeyboardMarkup, options?: EditMessageReplyMarkupOptions) => Promise<TelegramBot.Message | boolean>;
    deleteMessage: (chatId: number | string, messageId: number) => Promise<boolean>;
}

/**
 * Rate-limited bot wrapper.
 * All calls are routed through the TelegramQueue to respect Telegram's 25 msg/s limit.
 */
const bot: BotWrapper = {
    getMe: () => telegramQueue.enqueue(() => rawBot.getMe()),
    sendMessage: (chatId, text, options) => telegramQueue.enqueue(() => rawBot.sendMessage(chatId, text, options)),
    sendDocument: (chatId, doc, options, fileOptions) => telegramQueue.enqueue(() => rawBot.sendDocument(chatId, doc, options, fileOptions)),
    sendChatAction: (chatId, action) => telegramQueue.enqueue(() => rawBot.sendChatAction(chatId, action)),
    answerCallbackQuery: (id, options) => telegramQueue.enqueue(() => rawBot.answerCallbackQuery(id, options)),
    editMessageText: (text, options) => telegramQueue.enqueue(() => rawBot.editMessageText(text, options)),
    editMessageReplyMarkup: (markup, options) => telegramQueue.enqueue(() => rawBot.editMessageReplyMarkup(markup, options)),
    deleteMessage: (chatId, messageId) => telegramQueue.enqueue(() => rawBot.deleteMessage(chatId, messageId)),
};

export default bot;

// Convenience named exports (pass-through, kept for backward compatibility)
export const sendMessage = (chatId: number | string, text: string, options?: SendMessageOptions) => bot.sendMessage(chatId, text, options);
export const sendDocument = (chatId: number | string, doc: Buffer | string, options?: SendDocumentOptions, fileOptions?: Record<string, string>) => bot.sendDocument(chatId, doc, options, fileOptions);
export const answerCallbackQuery = (id: string, options?: Partial<AnswerCallbackQueryOptions>) => bot.answerCallbackQuery(id, options);
