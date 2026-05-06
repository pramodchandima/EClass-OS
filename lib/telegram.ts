import TelegramBot, {
    SendMessageOptions,
    SendDocumentOptions,
    AnswerCallbackQueryOptions,
    EditMessageTextOptions,
    EditMessageReplyMarkupOptions
} from 'node-telegram-bot-api';
import { telegramQueue } from './telegramQueue';

/**
 * BOT CONFIGURATION
 * Ensure the environment variable is present before initializing.
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing in environment variables.');
}

const rawBot = new TelegramBot(token);

/**
 * STRICTLY TYPED BOT WRAPPER INTERFACE
 */
export interface BotWrapper {
    /** Get basic information about the bot */
    getMe: () => Promise<TelegramBot.User>;

    /** Send a text message through the rate-limited queue */
    sendMessage: (chatId: number | string, text: string, options?: SendMessageOptions) => Promise<TelegramBot.Message>;

    /** Send a document/file through the rate-limited queue */
    sendDocument: (chatId: number | string, doc: any, options?: SendDocumentOptions, fileOptions?: any) => Promise<TelegramBot.Message>;

    /** Send a chat action (like 'typing') */
    sendChatAction: (chatId: number | string, action: TelegramBot.ChatAction) => Promise<boolean>;

    /** Answer a callback query from an inline button */
    answerCallbackQuery: (callbackQueryId: string, options?: Partial<AnswerCallbackQueryOptions>) => Promise<boolean>;

    /** Edit an existing text message */
    editMessageText: (text: string, options?: EditMessageTextOptions) => Promise<TelegramBot.Message | boolean>;

    /** Edit an existing message's reply markup (buttons) */
    editMessageReplyMarkup: (replyMarkup: TelegramBot.InlineKeyboardMarkup, options?: EditMessageReplyMarkupOptions) => Promise<TelegramBot.Message | boolean>;

    /** Delete a message */
    deleteMessage: (chatId: number | string, messageId: number) => Promise<boolean>;
}

/**
 * RATE LIMITED BOT WRAPPER
 * This ensures all calls to the Telegram API respect the 25 msgs/sec global limit 
 * and handles 429 errors automatically via the TelegramQueue.
 */
const bot: BotWrapper = {
    getMe: () => telegramQueue.enqueue(() => rawBot.getMe()),

    sendMessage: (chatId, text, options) =>
        telegramQueue.enqueue(() => rawBot.sendMessage(chatId, text, options)),

    sendDocument: (chatId, doc, options, fileOptions) =>
        telegramQueue.enqueue(() => rawBot.sendDocument(chatId, doc, options, fileOptions)),

    sendChatAction: (chatId, action) =>
        telegramQueue.enqueue(() => rawBot.sendChatAction(chatId, action)),

    answerCallbackQuery: (id, options) =>
        telegramQueue.enqueue(() => rawBot.answerCallbackQuery(id, options)),

    editMessageText: (text, options) =>
        telegramQueue.enqueue(() => rawBot.editMessageText(text, options)),

    editMessageReplyMarkup: (replyMarkup, options) =>
        telegramQueue.enqueue(() => rawBot.editMessageReplyMarkup(replyMarkup, options)),

    deleteMessage: (chatId, messageId) =>
        telegramQueue.enqueue(() => rawBot.deleteMessage(chatId, messageId))
};

export default bot;

/**
 * CONVENIENCE EXPORTS (Rate-limited)
 */
export async function sendMessage(chatId: number | string, text: string, options?: SendMessageOptions) {
    return await bot.sendMessage(chatId, text, options);
}

export async function sendDocument(chatId: number | string, doc: any, options?: SendDocumentOptions, fileOptions?: any) {
    return await bot.sendDocument(chatId, doc, options, fileOptions);
}

export async function answerCallbackQuery(id: string, options?: Partial<AnswerCallbackQueryOptions>) {
    return await bot.answerCallbackQuery(id, options);
}
