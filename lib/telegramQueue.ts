/**
 * TELEGRAM MESSAGE QUEUE & RATE LIMITER
 * Enforces a max of 25 messages/sec (one task every 40ms).
 * Handles 429 "Too Many Requests" by respecting `retry_after`.
 * Uses recursive setTimeout (tick pattern) to prevent call-stack overflows.
 */

type QueueTask<T = unknown> = {
    fn: () => Promise<T>;
    resolve: (val: T) => void;
    reject: (err: unknown) => void;
};

class TelegramQueue {
    private readonly queue: QueueTask[] = [];
    private isProcessing = false;
    private pauseUntil = 0;
    private readonly msBetweenTasks = 40; // 1000ms / 25 msgs = 40ms

    constructor() {
        this.start();
    }

    private start(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.tick();
    }

    /** Enqueue a task and return a promise that resolves with its result. */
    enqueue<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ fn, resolve: resolve as (val: unknown) => void, reject });
        });
    }

    /**
     * Background processor. Uses setTimeout instead of recursion to
     * prevent RangeError on deep call stacks.
     */
    private tick(): void {
        try {
            const now = Date.now();

            // Respect 429 back-off period
            if (now < this.pauseUntil) {
                setTimeout(() => this.tick(), Math.max(10, this.pauseUntil - now));
                return;
            }

            const task = this.queue.shift();
            if (!task) {
                setTimeout(() => this.tick(), 100); // idle sleep
                return;
            }

            // Execute and handle potential 429 errors
            task.fn().then(task.resolve).catch((error: unknown) => {
                const body = (error as { response?: { body?: { error_code?: number; parameters?: { retry_after?: number } } } })?.response?.body;
                if (body?.error_code === 429) {
                    const retryAfter = (body.parameters?.retry_after ?? 1) * 1000;
                    console.warn(`[TelegramQueue] Rate limited. Retrying after ${retryAfter}ms.`);
                    this.pauseUntil = Date.now() + retryAfter;
                    this.queue.unshift(task); // re-queue at the front
                } else {
                    task.reject(error);
                }
            }).finally(() => {
                setTimeout(() => this.tick(), this.msBetweenTasks);
            });

        } catch (fatalError) {
            console.error('[TelegramQueue] Fatal tick error:', fatalError);
            setTimeout(() => this.tick(), 1000); // recover and continue
        }
    }
}

/** Singleton instance shared across the server process. */
export const telegramQueue = new TelegramQueue();
